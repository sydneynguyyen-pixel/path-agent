import { useEffect, useRef, useState } from "react";
import { calm } from "@/lib/motion";

/** A count that rolls to its new value instead of jumping. */
export function Roll({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) return;
    if (calm()) return setShown(value);
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const p = Math.min(1, (now - start) / 420);
      setShown(Math.round(from + (value - from) * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="tabular-nums">{shown}</span>;
}
