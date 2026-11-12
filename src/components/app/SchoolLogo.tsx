import type { ReactNode } from "react";
import bayview from "@/assets/bayview-logo.png";
import northgate from "@/assets/northgate-logo.png";
import type { ClubId, OrgId } from "@/data/scenario";
import { cn } from "@/lib/utils";

const CREAM = "#FFF6E3";
const GOLD = "#F2C879";

/** Fictional logos for everyone who isn't Bayview or Northgate, drawn to sit beside those two crests. */
const MARKS: Record<Exclude<OrgId, "bayview" | "northgate">, ReactNode> = {
  lakeshore: <><path d="M20 1.5 36 10.7v18.6L20 38.5 4 29.3V10.7Z" fill="#1F5B4A" /><path d="m20 7 6.2 8.3h-3.3l4.8 7H12.3l4.8-7h-3.3Z" fill={GOLD} /><path d="M9.5 27c2.6 0 2.6 1.7 5.2 1.7s2.6-1.7 5.3-1.7 2.6 1.7 5.3 1.7 2.6-1.7 5.2-1.7M13 31.5c2.3 0 2.3 1.4 4.6 1.4s2.3-1.4 4.8-1.4 2.3 1.4 4.6 1.4" fill="none" stroke={CREAM} strokeWidth="1.9" strokeLinecap="round" /></>,
  "redwood-bend": <><circle cx="20" cy="20" r="18.5" fill="#9A3F24" /><path d="m20 5 4.6 7h-2.5l4.4 6.5h-2.7l5 7.5H11.2l5-7.5h-2.7l4.4-6.5h-2.5Z" fill={CREAM} /><rect x="18.3" y="26" width="3.4" height="7" rx="1" fill={GOLD} /></>,
  "eastshore-city": <><rect x="2" y="2" width="36" height="36" rx="10" fill="#22406E" /><path d="M6 25.5c7-11 21-11 28 0" fill="none" stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" /><path d="M5 26.5h30M13 19v7.5M20 16.8v9.7M27 19v7.5" stroke={CREAM} strokeWidth="2" strokeLinecap="round" /><path d="M9 31.5h22" stroke={CREAM} strokeWidth="2" strokeLinecap="round" opacity=".6" /></>,
  library: <><rect x="2" y="2" width="36" height="36" rx="10" fill="#0F6E7C" /><path d="M20 13c-3-2.4-7-3-11-2.4v17c4-.6 8 0 11 2.4 3-2.4 7-3 11-2.4v-17c-4-.6-8 0-11 2.4Z" fill={CREAM} /><path d="M20 13v17" stroke="#0F6E7C" strokeWidth="1.8" /></>,
  "design-collective": <><circle cx="15" cy="20" r="13" fill="#FF7A59" /><circle cx="25" cy="20" r="13" fill="#3C3AA8" style={{ mixBlendMode: "multiply" }} /></>,
  "open-eastshore": <><circle cx="20" cy="20" r="18.5" fill="#1C7ED6" /><rect x="10.5" y="20" width="4.8" height="9.5" rx="2.2" fill={CREAM} /><rect x="17.6" y="14" width="4.8" height="15.5" rx="2.2" fill={CREAM} /><rect x="24.7" y="10" width="4.8" height="19.5" rx="2.2" fill={GOLD} /></>,
  county: <><path d="M20 2 34.5 7v12.5C34.5 29 27 35.3 20 38 13 35.3 5.5 29 5.5 19.500V7Z" fill="#2D3A8C" /><path d="m20 8.5 1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6Z" fill={GOLD} /><path d="M10.5 28c3-5 6-5 9.5-2 3.5-3 6.5-3 9.5 2" fill="none" stroke={CREAM} strokeWidth="2.2" strokeLinecap="round" /></>,
  "harbor-grocery": <><circle cx="20" cy="20" r="18.5" fill="#2F8F4E" /><circle cx="20" cy="10.5" r="2.8" fill="none" stroke={CREAM} strokeWidth="2.2" /><path d="M20 13.300V31M14 18h12M9.5 23.500C10.5 28.5 15 31 20 31s9.5-2.5 10.5-7.5" fill="none" stroke={CREAM} strokeWidth="2.4" strokeLinecap="round" /></>,
  "history-center": <><rect x="2" y="2" width="36" height="36" rx="10" fill="#B8741A" /><path d="M12 9h16M12 31h16" stroke={CREAM} strokeWidth="2.6" strokeLinecap="round" /><path d="M14 10.500h12c0 5-3 6.3-4.6 9.5 1.6 3.2 4.6 4.5 4.6 9.500H14c0-5 3-6.3 4.6-9.500C17 16.8 14 15.5 14 10.500Z" fill={CREAM} /></>,
  "valley-museum": <><rect x="2" y="2" width="36" height="36" rx="10" fill="#6B3FA0" /><path d="m7.5 12 7 16 5.5-11 5.5 11 7-16" fill="none" stroke={CREAM} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></>,
  "harbor-health": <><rect x="2" y="2" width="36" height="36" rx="10" fill="#1B6F8A" /><path d="M16.500 10h7v6.500H30v7h-6.500V30h-7v-6.500H10v-7h6.500Z" fill={CREAM} /><path d="M8 31c4-2.400 8-2.400 12 0s8 2.400 12 0" fill="none" stroke={GOLD} strokeWidth="2.400" strokeLinecap="round" /></>,
  "food-network": <><circle cx="20" cy="20" r="18.5" fill="#E8772E" /><path d="M20 19.500c-5.5-3.8-7-6-7-8.3 0-2.2 1.8-3.7 3.7-3.7 1.4 0 2.6.8 3.3 2 .7-1.2 1.9-2 3.3-2 1.9 0 3.7 1.5 3.7 3.7 0 2.3-1.5 4.5-7 8.300Z" fill={CREAM} /><path d="M9 22.500h22c0 5.5-4.5 9.5-11 9.500S9 28 9 22.500Z" fill={GOLD} /></>,
};

/** Fictional campus club logos. */
const CLUB_MARKS: Record<ClubId, ReactNode> = {
  "people-products": <><rect x="2" y="2" width="36" height="36" rx="10" fill="#D6336C" /><circle cx="12.500" cy="20" r="5" fill={CREAM} /><path d="M26.500 13v14M19.500 20h14" stroke={GOLD} strokeWidth="4" strokeLinecap="round" /></>,
  "research-circle": <><circle cx="20" cy="20" r="18.500" fill="#0B7285" /><circle cx="18" cy="18" r="7.500" fill="none" stroke={CREAM} strokeWidth="3" /><path d="m23.800 23.800 6.200 6.200" stroke={GOLD} strokeWidth="3.600" strokeLinecap="round" /></>,
  "student-government": <><rect x="2" y="2" width="36" height="36" rx="10" fill="#5F3DC4" /><path d="M20 8.500 31 15.500H9Z" fill={GOLD} /><path d="M13 18.500v8.500M20 18.500v8.500M27 18.500v8.500" stroke={CREAM} strokeWidth="3" strokeLinecap="round" /><path d="M9.500 31h21" stroke={CREAM} strokeWidth="3" strokeLinecap="round" /></>,
  "data-club": <><circle cx="20" cy="20" r="18.500" fill="#364FC7" /><ellipse cx="20" cy="12.500" rx="9" ry="3.800" fill={GOLD} /><path d="M11 12.500v15c0 2.100 4 3.800 9 3.800s9-1.700 9-3.800v-15c0 2.100-4 3.800-9 3.800s-9-1.700-9-3.800Z" fill={CREAM} /><path d="M11 20c0 2.100 4 3.800 9 3.800s9-1.700 9-3.800" fill="none" stroke="#364FC7" strokeWidth="2" /></>,
};

function Mark({ org }: { org: Exclude<OrgId, "bayview" | "northgate"> }) {
  return <svg viewBox="0 0 40 40" aria-hidden="true">{MARKS[org]}</svg>;
}

type School = "bayview" | "northgate" | "lakeshore";
const SCHOOL_NAME: Record<School, string> = { bayview: "Bayview Community College", northgate: "Northgate State University", lakeshore: "Lakeshore Community College" };

export function SchoolLogo({ school, className }: { school: School; className?: string }) {
  if (school === "lakeshore") return <span role="img" aria-label={`${SCHOOL_NAME[school]} logo (fictional)`} className={cn("inline-block size-8 shrink-0 [&>svg]:size-full", className)}><Mark org="lakeshore" /></span>;
  return (
    <img
      src={school === "bayview" ? bayview : northgate}
      alt={`${SCHOOL_NAME[school]} logo (fictional)`}
      width={160}
      height={160}
      className={cn("size-8 object-contain", className)}
    />
  );
}

/** A school or organization's round profile picture. Decorative: its name is always written beside it. */
export function OrgLogo({ org, club, className }: { org: OrgId; club?: ClubId | undefined; className?: string }) {
  if (club) return (
    <span className={cn("org-logo-stack size-7", className)} aria-hidden="true">
      <span className="org-logo size-full"><svg viewBox="0 0 40 40">{CLUB_MARKS[club]}</svg></span>
      <OrgLogo org={org} className="org-logo-badge" />
    </span>
  );
  return (
    <span className={cn("org-logo size-7", className)} aria-hidden="true">
      {org === "bayview" || org === "northgate" ? <img src={org === "bayview" ? bayview : northgate} alt="" /> : <Mark org={org} />}
    </span>
  );
}
