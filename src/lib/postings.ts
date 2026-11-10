import { postings, type Experience, type Opportunity, type Posting } from "@/data/scenario";

/** The original listing for an opportunity, or for an event that matches one. */
export function postingFor(item: Opportunity | Experience): Posting | undefined {
  const id = "opportunityId" in item && item.opportunityId ? item.opportunityId : item.id;
  return postings[id];
}
