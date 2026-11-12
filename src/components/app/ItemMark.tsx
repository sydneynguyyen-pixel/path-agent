import type { ReactNode } from "react";
import { SubjectIcon, subjectFor } from "@/components/app/Brand";
import { photoUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";

/** An event's photo, the same size as a class's subject tile so mixed lists line up. Decorative. */
export function EventMark({ photo, className }: { photo: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("item-mark", className)}>
      <img src={photoUrl(photo, 96)} alt="" loading="lazy" draggable={false} />
    </span>
  );
}

/** A class-colored chip: the subject's sticker icon on a tint of its color, with readable text. */
export function ClassChip({ course, children, className }: { course: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn("class-chip", className)} data-family={subjectFor(course)}>
      <SubjectIcon course={course} bare className="class-chip-icon" />
      <span className="min-w-0">{children}</span>
    </span>
  );
}
