import canvas from "@/assets/canvas.svg.asset.json";
import banner from "@/assets/banner.png.asset.json";
import degreeworks from "@/assets/degreeworks.png.asset.json";
import assist from "@/assets/assist.png.asset.json";
import gmail from "@/assets/gmail.svg.asset.json";
import type { AccessKey } from "@/lib/journey";

export type ConnectedSource = { id: AccessKey; name: string; vendor: string; what: string; logo: string; usedBy: string[] };

/** Representative vendors a school might use. Connections are simulated in this prototype. */
export const connectedSources: ConnectedSource[] = [
  { id: "canvas", name: "Canvas", vendor: "Instructure", what: "Syllabi and assignment deadlines", logo: canvas.url, usedBy: ["Reader", "Backup finder"] },
  { id: "sis", name: "Student system (Banner)", vendor: "Ellucian Banner", what: "Transcript, enrollment, open seats", logo: banner.url, usedBy: ["Reader", "Backup finder"] },
  { id: "audit", name: "Degree audit (DegreeWorks)", vendor: "Ellucian DegreeWorks", what: "Northgate requirements and progress", logo: degreeworks.url, usedBy: ["Reader", "Planner"] },
  { id: "articulation", name: "Articulation data (ASSIST)", vendor: "ASSIST", what: "Course-to-course transfer rules", logo: assist.url, usedBy: ["Planner"] },
  { id: "email", name: "School email (drafts only)", vendor: "Google Workspace", what: "Save drafts you approve and send", logo: gmail.url, usedBy: ["Drafter"] },
];
