import React from "react";

/** Inline markdown to nodes: code, bold, italic (asterisk or underscore), links. */
function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(`[^`]+`)|(\*\*[^*]+?\*\*)|(\*[^*]+?\*)|(_[^_]+?_)|(\[[^\]]+?\]\([^)]+?\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      nodes.push(<code key={i} className="rounded bg-white/[0.08] px-1 py-0.5 font-mono text-[0.85em] text-aurora-teal">{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith("**")) {
      nodes.push(<strong key={i} className="font-semibold text-white">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("*") || tok.startsWith("_")) {
      nodes.push(<em key={i}>{tok.slice(1, -1)}</em>);
    } else {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      if (mm) nodes.push(<a key={i} href={mm[2]} target="_blank" rel="noopener noreferrer" className="text-aurora-teal underline decoration-aurora-teal/40 hover:decoration-aurora-teal">{mm[1]}</a>);
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const special = (l: string) => l.trim().startsWith("```") || /^(#{1,6})\s/.test(l) || /^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l);

/** Lightweight markdown renderer (no dependency) for AI output. */
export default function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) buf.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={k++} className="my-2 overflow-x-auto rounded-lg border border-white/[0.08] bg-black/40 p-3">
          <code className="font-mono text-[12.5px] leading-relaxed text-white/80">{buf.join("\n")}</code>
        </pre>
      );
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push(<p key={k++} className="mb-1 mt-3 font-display text-[15px] font-bold text-white">{parseInline(h[2])}</p>);
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ""));
      blocks.push(<ul key={k++} className="my-2 list-disc space-y-1 pl-5 marker:text-white/30">{items.map((it, j) => <li key={j}>{parseInline(it)}</li>)}</ul>);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ""));
      blocks.push(<ol key={k++} className="my-2 list-decimal space-y-1 pl-5 marker:text-white/30">{items.map((it, j) => <li key={j}>{parseInline(it)}</li>)}</ol>);
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !special(lines[i])) para.push(lines[i++]);
    blocks.push(
      <p key={k++} className="my-1.5 leading-relaxed">
        {para.map((pl, j) => (
          <React.Fragment key={j}>
            {parseInline(pl)}
            {j < para.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return <div className="text-[14px] text-white/80">{blocks}</div>;
}
