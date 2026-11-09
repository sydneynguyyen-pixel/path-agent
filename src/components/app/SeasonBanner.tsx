import fall from "@/assets/valley-fall.jpg";
import spring from "@/assets/valley-spring.jpg";
import summer from "@/assets/valley-hero.jpg";
import winter from "@/assets/valley-winter.jpg";
import { seasonFor } from "./Brand";

const paintings = { fall, winter, spring, summer } as const;
type Season = keyof typeof paintings;

/** The same valley in each season. All four stay mounted so switching terms crossfades. */
export function SeasonBanner({ term }: { term: string }) {
  const found = seasonFor(term);
  const active: Season = found === "neutral" ? "summer" : found;

  return (
    <div className="season-banner" aria-hidden="true">
      {(Object.keys(paintings) as Season[]).map((season) => (
        <img key={season} src={paintings[season]} alt="" data-active={season === active} width={1920} height={1088} />
      ))}
    </div>
  );
}
