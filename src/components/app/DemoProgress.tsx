import { Check } from "lucide-react";
import { useJourney } from "@/lib/journey";
import { recoveryPath } from "@/lib/confidence";
import { options } from "@/data/scenario";
import { cn } from "@/lib/utils";

/** Compact journey tracker so a live-demo audience always knows where we are. */
export function DemoProgress() {
  const j = useJourney();
  const chosen = options.find((o) => o.id === j.chosenId);
  const fast = chosen && recoveryPath(chosen) === "now";
  const steps = [
    { label: "Section full", done: j.stage !== "idle" },
    { label: "Pick option", done: !!chosen },
    { label: "Hold seat", done: j.seatHeld },
    ...(fast ? [] : [{ label: "Email approved", done: j.emailSent }, { label: "Counselor", done: !!j.counselor }]),
  ];
  return (
    <ol className="hidden items-center gap-1 lg:flex">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-1">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]", s.done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
            {s.done && <Check className="size-3" />}
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="h-px w-3 bg-border" />}
        </li>
      ))}
    </ol>
  );
}
