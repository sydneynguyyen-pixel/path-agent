import { ArrowUpRight } from "lucide-react";
import type { Experience, Opportunity } from "@/data/scenario";
import { postingFor } from "@/lib/postings";
import { cn } from "@/lib/utils";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import lumaLogo from "@/assets/luma-logo.png";
import eventbriteLogo from "@/assets/eventbrite-logo.png";
import handshakeLogo from "@/assets/handshake-logo.png";

const SITE_LOGOS: Record<string, string> = { Luma: lumaLogo, Eventbrite: eventbriteLogo, Handshake: handshakeLogo };

/** The posting site's own logo: Luma, Eventbrite, Handshake, or the school for its clubs and catalog. */
function SiteMark({ site }: { site: string }) {
  if (SITE_LOGOS[site]) return <img src={SITE_LOGOS[site]} alt="" aria-hidden="true" className="size-5 shrink-0 rounded-[5px] object-cover" />;
  if (site.startsWith("Bayview")) return <SchoolLogo school="bayview" className="!size-5" />;
  if (site.startsWith("Northgate")) return <SchoolLogo school="northgate" className="!size-5" />;
  return <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />;
}

/** Opens the original listing in a new tab: a pill with the posting site's logo. */
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
      className={cn("posting-pill", className)}
    >
      <SiteMark site={p.site} />
      View on {p.site}
      <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
