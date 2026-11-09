import canvas from "@/assets/canvas.svg.asset.json";
import banner from "@/assets/banner.png.asset.json";
import degreeworks from "@/assets/degreeworks-logo.png";
import handshake from "@/assets/handshake-logo.png";
import assist from "@/assets/assist-logo.png";
import gmail from "@/assets/gmail.svg.asset.json";
import { student } from "@/data/scenario";
import type { AccessKey } from "@/lib/journey";

export type ConnectedSource = { id: AccessKey; name: string; vendor: string; what: string; logo: string; usedBy: string[] };

/** Representative vendors a school might use. Connections are simulated in this prototype. */
export const connectedSources: ConnectedSource[] = [
  { id: "canvas", name: "Canvas", vendor: "Instructure", what: "Syllabi and assignment deadlines", logo: canvas.url, usedBy: ["Reader", "Backup finder"] },
  { id: "sis", name: "Student system (Banner)", vendor: "Ellucian Banner", what: "Transcript, enrollment, open seats", logo: banner.url, usedBy: ["Reader", "Backup finder"] },
  { id: "audit", name: "Degree audit (DegreeWorks)", vendor: "Ellucian DegreeWorks", what: "Northgate requirements and progress", logo: degreeworks, usedBy: ["Reader", "Planner"] },
  { id: "articulation", name: "Articulation data (ASSIST)", vendor: "ASSIST", what: "Course-to-course transfer rules", logo: assist, usedBy: ["Planner"] },
  { id: "handshake", name: "Career center (Handshake)", vendor: "Handshake", what: "Jobs, internships and career-center appointments", logo: handshake, usedBy: ["Reader"] },
  { id: "email", name: "School email (drafts only)", vendor: "Google Workspace", what: "Save drafts you approve and send", logo: gmail.url, usedBy: ["Drafter"] },
];

export type SchoolSignIn = { id: "bayview" | "northgate"; name: string; url: string; studentId: string; sources: AccessKey[] };

/** Each school's single sign-on grants the sources that school holds. ASSIST is public and needs none. */
export const schoolSignIns: SchoolSignIn[] = [
  { id: "bayview", name: "Bayview Community College", url: "sso.bayview.example", studentId: student.schoolIds.bayview, sources: ["sis", "canvas", "handshake", "email"] },
  { id: "northgate", name: "Northgate State University", url: "sso.northgate.example", studentId: student.schoolIds.northgate, sources: ["audit"] },
];
