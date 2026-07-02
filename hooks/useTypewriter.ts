"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface UseTypewriterOptions {
  active?: boolean;
  speed?: number; // ms per character
  startDelay?: number; // ms before typing begins
  /** Loop through the messages, pausing on each. */
  loop?: boolean;
  holdMs?: number; // pause after a message completes (loop mode)
}

/**
 * Typewriter — types one or more messages character by character.
 * Reduced motion shows the (first) message fully, instantly. Powers the AI Coach.
 */
export function useTypewriter(
  messages: string | string[],
  { active = true, speed = 26, startDelay = 400, loop = false, holdMs = 2600 }: UseTypewriterOptions = {}
): { text: string; done: boolean; index: number } {
  const list = Array.isArray(messages) ? messages : [messages];
  const reduced = usePrefersReducedMotion();
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const [index, setIndex] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setText(list[0]);
      setDone(true);
      return;
    }
    let msg = 0;
    const clearAll = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };

    const typeMessage = () => {
      const full = list[msg];
      setIndex(msg);
      setText("");
      setDone(false);
      let i = 0;
      const step = () => {
        i += 1;
        setText(full.slice(0, i));
        if (i < full.length) timers.current.push(setTimeout(step, speed));
        else {
          setDone(true);
          if (loop && list.length > 1) {
            timers.current.push(
              setTimeout(() => {
                msg = (msg + 1) % list.length;
                typeMessage();
              }, holdMs)
            );
          }
        }
      };
      timers.current.push(setTimeout(step, speed));
    };

    timers.current.push(setTimeout(typeMessage, startDelay));
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduced, speed, startDelay, loop, holdMs]);

  return { text, done, index };
}
