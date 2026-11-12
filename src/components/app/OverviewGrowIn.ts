import { useEffect, useState } from "react";
import { opportunities } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { newestMapItem, readList, readStore, shouldGrow, writeStore } from "@/lib/motionOverview";

const KEY = "trellis:map-grown";
const GROW_MS = 900;

/**
 * The newest thing she saved, the first time the map shows it. Returns its id for a moment,
 * long enough for the scale-in and ring to play once, then null.
 */
export function useNewestGrowIn(present: (id: string) => boolean): string | null {
  const j = useJourney();
  const id = newestMapItem(j.savedOpportunities, j.draftCourses, opportunities);
  const [grow, setGrow] = useState<string | null>(null);
  const shown = !!id && present(id);

  useEffect(() => {
    const seen = readList(readStore("session", KEY));
    if (!shown || !shouldGrow(id, seen)) return;
    writeStore("session", KEY, JSON.stringify([...seen, id].slice(-50)));
    setGrow(id);
  }, [id, shown]);

  useEffect(() => {
    if (!grow) return;
    const t = setTimeout(() => setGrow(null), GROW_MS);
    return () => clearTimeout(t);
  }, [grow]);

  return grow;
}
