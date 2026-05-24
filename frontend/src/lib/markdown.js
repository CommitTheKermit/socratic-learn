import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment } from "react";
function renderInline(text) {
    const parts = [];
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let last = 0;
    let key = 0;
    let m;
    while ((m = re.exec(text))) {
        if (m.index > last)
            parts.push(text.slice(last, m.index));
        const s = m[0];
        if (s.startsWith("**"))
            parts.push(_jsx("strong", { children: s.slice(2, -2) }, key++));
        else if (s.startsWith("*"))
            parts.push(_jsx("em", { children: s.slice(1, -1) }, key++));
        else if (s.startsWith("`"))
            parts.push(_jsx("code", { className: "md-code", children: s.slice(1, -1) }, key++));
        last = re.lastIndex;
    }
    if (last < text.length)
        parts.push(text.slice(last));
    return parts;
}
export function Markdown({ text }) {
    const lines = text.split("\n");
    const blocks = [];
    let code = null;
    let para = [];
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
            }
            else {
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
    return (_jsx("div", { className: "md-body", children: blocks.map((b, i) => {
            if (b.kind === "code") {
                return (_jsxs("pre", { className: "code-block", children: [b.lang && _jsx("span", { className: "code-lang", children: b.lang }), _jsx("code", { children: b.text })] }, i));
            }
            return (_jsx("p", { children: renderInline(b.text).map((node, j) => (_jsx(Fragment, { children: node }, j))) }, i));
        }) }));
}
