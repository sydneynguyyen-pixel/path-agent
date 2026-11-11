import { Check, Hourglass } from "lucide-react";
import { SLOT_LABEL, type SlotStatus } from "@/lib/degree";

/** One status mark, used by the audit and the tree so a state always looks the same. */
export function DegreeMark({ status }: { status: SlotStatus | "option" }) {
  return (
    <span className="dg-mark" data-st={status} title={SLOT_LABEL[status]}>
      {status === "done" && <Check strokeWidth={3} aria-hidden="true" />}
      {status === "check" && <Hourglass strokeWidth={2.5} aria-hidden="true" />}
      <span className="sr-only">{SLOT_LABEL[status]}</span>
    </span>
  );
}
