import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/bits";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import { progress, schools, student } from "@/data/scenario";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Profile — Academic Path Agent" },
      { name: "description", content: "Maya's student profile: schools, program, counselor and goals." },
      { property: "og:title", content: "Profile — Academic Path Agent" },
      { property: "og:description", content: "The student profile the agent plans around." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const fields = [
    ["Major", "Psychology B.A. (Northgate)"],
    ["Associate degree", "A.A. Social & Behavioral Sciences (Bayview)"],
    ["Expected graduation", progress.gradTerm],
    ["Counselor", `${student.counselor} · ${student.counselorEmail}`],
    ["Enrollment", "Full-time · works 20 hrs/week"],
    ["Preferred class times", "Mornings, Mon–Thu"],
  ];
  return (
    <div className="max-w-3xl">
      <PageHeader title="Profile" sub="The agent uses this to rank options. Data comes from your school records." />
      <div className="flex items-center gap-4 rounded-2xl border p-5">
        <div className="grid size-16 place-items-center rounded-full bg-lilac text-xl font-semibold text-accent-foreground">MT</div>
        <div>
          <div className="text-lg font-medium">{student.name}</div>
          <div className="text-sm text-muted-foreground">Student ID 000-SYN-4471 · synthetic record</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(["bayview", "northgate"] as const).map((k) => (
          <div key={k} className="flex items-center gap-4 rounded-2xl border p-5">
            <SchoolLogo school={k} className="size-12" />
            <div>
              <div className="font-medium">{schools[k].name}</div>
              <div className="text-sm text-muted-foreground">{schools[k].role}</div>
              <div className="text-xs text-muted-foreground">{schools[k].system}</div>
            </div>
          </div>
        ))}
      </div>

      <dl className="mt-6 divide-y rounded-2xl border">
        {fields.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[180px_1fr] gap-4 p-4 text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
