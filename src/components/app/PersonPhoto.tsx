import { OrgLogo } from "@/components/app/SchoolLogo";
import type { OrgId } from "@/data/scenario";
import { photoUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";

/** A person's photo with the logo of where they work or study. Decorative: the name is always written beside it. */
export function PersonPhoto({ photo, org, size = "md", className }: { photo: string; org?: OrgId; size?: "sm" | "md" | "lg"; className?: string }) {
  const px = size === "sm" ? 36 : size === "md" ? 48 : 64;
  return (
    <span className={cn("person-photo", `person-photo-${size}`, className)} aria-hidden="true">
      <img src={photoUrl(photo, px * 2)} alt="" loading="lazy" draggable={false} />
      {org && <OrgLogo org={org} className="person-photo-org" />}
    </span>
  );
}
