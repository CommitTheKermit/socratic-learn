import { createElement, Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { parseSegments, renderMath } from "./mathSegments";

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let key = 0;
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

  for (const seg of parseSegments(text)) {
    if (seg.type !== "plain") {
      const html = renderMath(seg.latex, seg.type === "blockMath");
      parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: html }} />);
      continue;
    }
    // plain 세그먼트: 기존 bold/italic/code 렌더
    re.lastIndex = 0;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(seg.text))) {
      if (m.index > last) parts.push(seg.text.slice(last, m.index));
      const s = m[0];
      if (s.startsWith("**")) parts.push(<strong key={key++}>{s.slice(2, -2)}</strong>);
      else if (s.startsWith("*")) parts.push(<em key={key++}>{s.slice(1, -1)}</em>);
      else
        parts.push(
          <code key={key++} className="md-code">
            {s.slice(1, -1)}
          </code>,
        );
      last = re.lastIndex;
    }
    if (last < seg.text.length) parts.push(seg.text.slice(last));
  }
  return parts;
}

type Block =
  | { kind: "p"; text: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "code"; lang: string; text: string }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "mathBlock"; latex: string }
  | { kind: "hr" };

// 수평선(hr): `-`/`*`/`_` 3개 이상이 (사이 공백 허용) 한 줄을 이룰 때. em/en dash 는
// parseBlocks 진입 시 이미 `-` 로 정규화된다. 표 구분선은 `|` 가 있어 별도 분기에서만 처리되므로 충돌 없음.
function isHr(line: string): boolean {
  const s = line.trim();
  return /^([-*_])([ \t]*\1){2,}$/.test(s);
}

// 리스트 항목(`- `/`* `/`+ ` 또는 `1. `). 기호 뒤 공백 필수. ordered 는 숫자 마커.
function parseListItem(line: string): { ordered: boolean; text: string } | null {
  const m = /^\s*([-*+]|\d{1,9}\.)\s+(.*\S)\s*$/.exec(line);
  if (!m) return null;
  return { ordered: /\d/.test(m[1]), text: m[2] };
}

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
  // em dash(—)/en dash(–) 는 항상 일반 hyphen(-) 으로 정규화.
  const lines = text.replace(/[—–]/g, "-").split("\n");
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
    // $$ 블록 수식: 독립 라인으로 시작하는 멀티라인 블록
    if (!code && line.trim().startsWith("$$")) {
      flush();
      const trimmed = line.trim();
      // 단일 라인: $$...$$
      if (trimmed.length > 4 && trimmed.endsWith("$$")) {
        blocks.push({ kind: "mathBlock", latex: trimmed.slice(2, -2).trim() });
        continue;
      }
      // 멀티라인: 닫기 $$ 탐색
      const mathLines: string[] = trimmed.length > 2 ? [trimmed.slice(2)] : [];
      let closed = false;
      while (i + 1 < lines.length) {
        i++;
        const ml = lines[i];
        if (ml.trim() === "$$") {
          closed = true;
          break;
        }
        if (ml.trim().endsWith("$$") && ml.trim().length > 2) {
          mathLines.push(ml.trim().slice(0, -2));
          closed = true;
          break;
        }
        mathLines.push(ml);
      }
      if (closed) {
        blocks.push({ kind: "mathBlock", latex: mathLines.join("\n").trim() });
      } else {
        // 닫히지 않은 블록 - 원문 유지 (스트리밍 중간 상태)
        blocks.push({ kind: "p", text: line.trim() + (mathLines.length ? "\n" + mathLines.join("\n") : "") });
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
    // 수평선(hr): 헤딩/리스트보다 먼저 본다(`---`, `***`, `___`, `- - -`).
    if (isHr(line)) {
      flush();
      blocks.push({ kind: "hr" });
      continue;
    }
    // ATX 헤딩(# ~ ######). 기호 뒤 공백이 있어야 헤딩으로 본다(#tag 오인식 방지).
    const heading = /^(#{1,6})\s+(.*\S)\s*$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      continue;
    }
    // 리스트: 연속한 항목 줄을 한 블록으로 묶는다. 종류는 첫 항목 마커로 결정.
    const first = parseListItem(line);
    if (first) {
      flush();
      const items = [first.text];
      while (i + 1 < lines.length) {
        const next = parseListItem(lines[i + 1]);
        if (!next) break;
        items.push(next.text);
        i += 1;
      }
      blocks.push({ kind: "list", ordered: first.ordered, items });
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
  if (b.kind === "heading") return `${"#".repeat(b.level)} ${b.text}`;
  if (b.kind === "list")
    return b.items.map((it, idx) => (b.ordered ? `${idx + 1}. ${it}` : `- ${it}`)).join("\n");
  if (b.kind === "table")
    return [b.header.join(" | "), ...b.rows.map((r) => r.join(" | "))].join("\n");
  if (b.kind === "mathBlock") return `$$${b.latex}$$`;
  if (b.kind === "hr") return "---";
  return b.text;
}

function renderBlock(b: Block, key: number): ReactNode {
  if (b.kind === "hr") {
    return <hr key={key} className="md-hr" />;
  }
  if (b.kind === "mathBlock") {
    const html = renderMath(b.latex, true);
    return <div key={key} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (b.kind === "heading") {
    const level = Math.min(Math.max(b.level, 1), 6);
    return createElement(
      `h${level}`,
      { key, className: "md-h" },
      renderInline(b.text).map((node, j) => <Fragment key={j}>{node}</Fragment>),
    );
  }
  if (b.kind === "list") {
    const items = b.items.map((it, idx) => (
      <li key={idx}>
        {renderInline(it).map((node, k) => (
          <Fragment key={k}>{node}</Fragment>
        ))}
      </li>
    ));
    return createElement(b.ordered ? "ol" : "ul", { key, className: "md-list" }, items);
  }
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
