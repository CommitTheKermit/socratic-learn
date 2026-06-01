import { Fragment, type ReactNode } from "react";

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

export function Markdown({ text }: { text: string }) {
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
  return (
    <div className="md-body">
      {blocks.map((b, i) => {
        if (b.kind === "code") {
          return (
            <pre key={i} className="code-block">
              {b.lang && <span className="code-lang">{b.lang}</span>}
              <code>{b.text}</code>
            </pre>
          );
        }
        if (b.kind === "table") {
          return (
            <table key={i} className="md-table">
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
          <p key={i}>
            {renderInline(b.text).map((node, j) => (
              <Fragment key={j}>{node}</Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
