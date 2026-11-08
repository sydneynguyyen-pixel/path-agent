import canvas from "@/assets/canvas.svg.asset.json";
import ellucian from "@/assets/ellucian.png.asset.json";
import assist from "@/assets/assist.png.asset.json";
import gmail from "@/assets/gmail.svg.asset.json";
import type { AccessKey } from "@/lib/journey";

export type ConnectedSource = { id: AccessKey; name: string; vendor: string; what: string; logo: string; usedBy: string[] };

/** Representative vendors a school might use. Connections are simulated in this prototype. */
export const connectedSources: ConnectedSource[] = [
  { id: "canvas", name: "Canvas", vendor: "Instructure", what: "Syllabi and assignment deadlines", logo: canvas.url, usedBy: ["Reader", "Backup finder"] },
  { id: "sis", name: "Student system (Banner)", vendor: "Ellucian", what: "Transcript, enrollment, open seats", logo: ellucian.url, usedBy: ["Reader", "Backup finder"] },
  { id: "audit", name: "Degree audit (Degree Works)", vendor: "Ellucian", what: "Northgate requirements and progress", logo: ellucian.url, usedBy: ["Reader", "Planner"] },
  { id: "articulation", name: "Articulation data (ASSIST)", vendor: "ASSIST", what: "Course-to-course transfer rules", logo: assist.url, usedBy: ["Planner"] },
  { id: "email", name: "School email (drafts only)", vendor: "Google Workspace", what: "Save drafts you approve and send", logo: gmail.url, usedBy: ["Drafter"] },
];
