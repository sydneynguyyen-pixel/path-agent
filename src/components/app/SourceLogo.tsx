import { connectedSources } from "./sourcesData";
import { cn } from "@/lib/utils";

export function SourceLogo({ id, className }: { id: string; className?: string }) {
  const s = connectedSources.find((x) => x.id === id);
  if (!s) return null;
  return (
    <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl border bg-card", className)}>
      <img src={s.logo} alt={`${s.vendor} logo`} width={24} height={24} className="size-6 object-contain" loading="lazy" />
    </div>
  );
}
