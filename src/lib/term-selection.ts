import { terms } from "@/data/scenario";

export const defaultSelectedTermId = terms.find((term) => term.status === "registering")?.id ?? terms[0]?.id ?? "";
export function selectTerm(current: string, next: string): string {
  return terms.some((term) => term.id === next) ? next : current;
}