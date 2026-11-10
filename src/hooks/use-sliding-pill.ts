import { useEffect, useLayoutEffect, useRef } from "react";
import { useLiquidGlass } from "@/hooks/use-liquid-glass";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Glides one shared highlight between items instead of swapping a background on each.
 * The container must be positioned and render the pill as a direct child. Offsets are
 * layout values, so an item's hover lift or press scale cannot knock the pill off target.
 */
export function useSlidingPill<C extends HTMLElement>(activeSelector: string) {
  const containerRef = useRef<C>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  useLiquidGlass(pillRef, { bezel: 8, scale: 14 });

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    const pill = pillRef.current;
    if (!container || !pill) return;

    let last: { x: number; y: number } | undefined;
    let glide: ReturnType<typeof setTimeout>;
    const place = () => {
      const active = container.querySelector<HTMLElement>(activeSelector);
      if (!active) {
        delete container.dataset["pillReady"];
        return;
      }
      pill.style.width = `${active.offsetWidth}px`;
      pill.style.height = `${active.offsetHeight}px`;
      pill.style.transform = `translate3d(${active.offsetLeft}px, ${active.offsetTop}px, 0)`;
      // Labels only pass under the glass while it travels. At rest the active label sits on top, fully sharp.
      if (last && (last.x !== active.offsetLeft || last.y !== active.offsetTop)) {
        pill.dataset["gliding"] = "";
        clearTimeout(glide);
        glide = setTimeout(() => delete pill.dataset["gliding"], 420);
      }
      last = { x: active.offsetLeft, y: active.offsetTop };
      if (container.dataset["pillReady"] === undefined) {
        // First placement lands instantly; only later moves should glide.
        pill.style.transition = "none";
        pill.getBoundingClientRect();
        container.dataset["pillReady"] = "";
        requestAnimationFrame(() => (pill.style.transition = ""));
      }
    };

    place();
    const mutations = new MutationObserver(place);
    mutations.observe(container, { subtree: true, attributes: true, attributeFilter: ["aria-current", "aria-pressed", "data-state"] });
    const resizes = new ResizeObserver(place);
    resizes.observe(container);
    void document.fonts?.ready.then(place);
    return () => {
      clearTimeout(glide);
      mutations.disconnect();
      resizes.disconnect();
    };
  }, [activeSelector]);

  return { containerRef, pillRef };
}
