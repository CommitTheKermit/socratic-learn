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
  | { kind: "code"; lang: string; text: string };

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
  for (const line of lines) {
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
    if (line.trim() === "") {
      flush();
      continue;
    }
    para.push(line.trim());
  }
  flush();
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
