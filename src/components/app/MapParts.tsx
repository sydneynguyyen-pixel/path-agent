import { GraduationCap } from "lucide-react";
import { OrgLogo, SchoolLogo } from "@/components/app/SchoolLogo";
import type { MapVisual } from "@/lib/map";
import { photoUrl } from "@/lib/photos";

export function Visual({ visual, title }: { visual?: MapVisual | undefined; title: string }) {
  if (!visual) return null;
  if (visual.type === "photo") return <span className="mn-visual"><img src={photoUrl(visual.photo, 96)} alt="" loading="lazy" draggable={false} /></span>;
  if (visual.type === "cap") return <span className="mn-visual" style={{ background: "var(--foreground)", color: "var(--card)" }}><GraduationCap className="size-3.5" aria-label={title} /></span>;
  if (visual.type === "school") return <span className="mn-visual mn-visual-logo"><SchoolLogo school={visual.school} className="size-full" /></span>;
  return <span className="mn-visual mn-visual-logo"><OrgLogo org={visual.org} {...(visual.club ? { club: visual.club } : {})} className="size-full" /></span>;
}
