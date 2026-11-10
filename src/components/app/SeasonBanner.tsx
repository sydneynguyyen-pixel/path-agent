/** The header painting for a page. Sits first in the page so it bleeds to the frame's edges. */
export function PageBanner({ src, position }: { src: string; position?: string }) {
  return (
    <div className="season-banner" aria-hidden="true">
      <img src={src} alt="" data-active="true" style={position ? { objectPosition: position } : undefined} />
    </div>
  );
}
