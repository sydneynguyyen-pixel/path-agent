import { ArrowUpRight } from "lucide-react";
import type { Experience, Opportunity } from "@/data/scenario";
import { postingFor } from "@/lib/postings";
import { cn } from "@/lib/utils";

/** Opens the original listing in a new tab. */
export function PostingLink({ item, compact = false, className }: { item: Opportunity | Experience; compact?: boolean; className?: string | undefined }) {
  const p = postingFor(item);
  if (!p) return null;
  if (compact) {
    return (
      <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title={`View on ${p.site}`} aria-label={`View ${item.title} on ${p.site} (opens in a new tab)`} className={cn("relative z-20 grid size-8 shrink-0 place-items-center rounded-full border bg-card text-foreground hover:bg-secondary", className)}>
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </a>
    );
  }
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline", className)}
    >
      View on {p.site}
      <ArrowUpRight className="size-3" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
