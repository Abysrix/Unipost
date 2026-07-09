import { wordCount } from "@/lib/utils";

/** Word count for the current content. */
export default function WordCounter({ text }: { text: string }) {
  const words = wordCount(text);
  return (
    <span className="font-mono text-[11px] tabular-nums text-white/35">
      {words} {words === 1 ? "word" : "words"}
    </span>
  );
}
