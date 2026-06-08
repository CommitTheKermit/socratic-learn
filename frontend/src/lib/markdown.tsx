import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const s = m[0];
    if (s.startsWith("**")) parts.push(<strong key={key++}>{s.slice(2, -2)}</strong>);
    else if (s.startsWith("*")) parts.push(<em key={key++}>{s.slice(1, -1)}</em>);
    else if (s.startsWith("`"))
      parts.push(
        <code key={key++} className="md-code">
          {s.slice(1, -1)}
        </code>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

type Block =
  | { kind: "p"; text: string }
  | { kind: "code"; lang: string; text: string }
  | { kind: "table"; header: string[]; rows: string[][] };

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isTableRow(line: string): boolean {
  // GFM 은 바깥 파이프를 생략해도 표로 본다. | 가 하나라도 있으면 후보.
  return line.includes("|") && line.trim() !== "";
}

function isTableSeparator(line: string): boolean {
  const s = line.trim();
  if (!s.includes("-") || !/^[|\s:-]+$/.test(s)) return false;
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let code: { lang: string; lines: string[] } | null = null;
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      blocks.push({ kind: "p", text: para.join(" ") });
      para = [];
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      flush();
      if (code) {
        blocks.push({ kind: "code", lang: code.lang, text: code.lines.join("\n") });
        code = null;
      } else {
        code = { lang: line.slice(3).trim(), lines: [] };
      }
      continue;
    }
    if (code) {
      code.lines.push(line);
      continue;
    }
    // 표 인식: 현재 줄이 | ... | 이고, 다음 줄이 |---|---| 구분선이면 표 시작
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flush();
      const header = splitRow(line);
      i += 1; // skip separator
      const rows: string[][] = [];
      while (i + 1 < lines.length && isTableRow(lines[i + 1])) {
        i += 1;
        rows.push(splitRow(lines[i]));
      }
      blocks.push({ kind: "table", header, rows });
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    para.push(line.trim());
  }
  flush();
  // 미완 코드블록 안전: 닫히지 않은 코드는 그대로 렌더 (스트리밍 중간 상태)
  if (code) {
    blocks.push({ kind: "code", lang: code.lang, text: code.lines.join("\n") });
  }
  return blocks;
}

// 활성(스트리밍 중인 마지막) 블록을 raw 텍스트로 환원한다. settle 시 renderBlock 으로 서식화된다.
function blockRawText(b: Block): string {
  if (b.kind === "code") return b.text;
  if (b.kind === "table")
    return [b.header.join(" | "), ...b.rows.map((r) => r.join(" | "))].join("\n");
  return b.text;
}

function renderBlock(b: Block, key: number): ReactNode {
  if (b.kind === "code") {
    return (
      <pre key={key} className="code-block">
        {b.lang && <span className="code-lang">{b.lang}</span>}
        <code>{b.text}</code>
      </pre>
    );
  }
  if (b.kind === "table") {
    return (
      <table key={key} className="md-table">
        <thead>
          <tr>
            {b.header.map((h, j) => (
              <th key={j}>
                {renderInline(h).map((node, k) => (
                  <Fragment key={k}>{node}</Fragment>
                ))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c}>
                  {renderInline(cell).map((node, k) => (
                    <Fragment key={k}>{node}</Fragment>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <p key={key}>
      {renderInline(b.text).map((node, j) => (
        <Fragment key={j}>{node}</Fragment>
      ))}
    </p>
  );
}

type Chunk = { id: number; text: string };

/**
 * 스트리밍 중인 마지막(활성) 블록.
 * raw 텍스트가 자라면 "새로 추가된 조각"만 별도 span 으로 append 하고, 그 span 은
 * mount 시점에 1회만 fade-in 한다(CSS `md-fade-chunk`). 이미 mount 된 조각 span 은
 * 안정 key(c.id) 라 재마운트되지 않으므로 재페이드/깜빡임이 없다.
 */
function StreamingActiveBlock({
  raw,
  kind,
  lang,
}: {
  raw: string;
  kind: Block["kind"];
  lang?: string;
}) {
  const [chunks, setChunks] = useState<Chunk[]>(() => (raw ? [{ id: 0, text: raw }] : []));
  const seenRef = useRef(raw);
  const idRef = useRef(1);

  useEffect(() => {
    if (raw === seenRef.current) return;
    // append-only 가 아닌 변화(재시도/블록 재파싱)는 이 블록만 리셋한다.
    if (!raw.startsWith(seenRef.current)) {
      seenRef.current = raw;
      setChunks(raw ? [{ id: idRef.current++, text: raw }] : []);
      return;
    }
    const added = raw.slice(seenRef.current.length);
    seenRef.current = raw;
    if (added) setChunks((cur) => [...cur, { id: idRef.current++, text: added }]);
  }, [raw]);

  const spans = chunks.map((c) => (
    <span key={c.id} className="md-fade-chunk">
      {c.text}
    </span>
  ));

  if (kind === "code") {
    return (
      <pre className="code-block">
        {lang && <span className="code-lang">{lang}</span>}
        <code>{spans}</code>
      </pre>
    );
  }
  return <p className="md-stream-p">{spans}</p>;
}

export function Markdown({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const blocks = parseBlocks(text);
  const lastIdx = blocks.length - 1;
  return (
    <div className="md-body">
      {blocks.map((b, i) => {
        // 스트리밍 중에는 "마지막 블록"만 토큰 단위 fade. 이전(완료) 블록은 서식화·고정.
        if (streaming && i === lastIdx) {
          return (
            <StreamingActiveBlock
              key={i}
              raw={blockRawText(b)}
              kind={b.kind}
              lang={b.kind === "code" ? b.lang : undefined}
            />
          );
        }
        return renderBlock(b, i);
      })}
    </div>
  );
}
