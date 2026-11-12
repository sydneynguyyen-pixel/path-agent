import { sources } from "@/data/scenario";
import { SourceChip } from "@/components/app/bits";

/** A source chip, only for sources the app can open. An unknown id is left out rather than shown broken. */
export function SafeSource({ id }: { id: string }) {
  return id in sources ? <SourceChip id={id} /> : null;
}
