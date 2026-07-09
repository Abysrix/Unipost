import MarkdownRenderer from "./MarkdownRenderer";
import TypingIndicator from "./TypingIndicator";

/** Renders (markdown) assistant text, with a typing indicator while empty and a
 *  blinking caret while streaming. */
export default function StreamingText({ content, streaming }: { content: string; streaming: boolean }) {
  if (streaming && !content) return <TypingIndicator />;
  return (
    <div className="relative">
      <MarkdownRenderer content={content} />
      {streaming && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-aurora-cyan align-middle" />}
    </div>
  );
}
