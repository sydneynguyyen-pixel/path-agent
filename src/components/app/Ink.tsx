import { cn } from "@/lib/utils";

/** The agent working: a slow drop of paint turning in water. Replaces every spinner in the product. */
export function Ink({ className }: { className?: string }) {
  return <span className={cn("ink size-4 shrink-0", className)} aria-hidden="true" />;
}
