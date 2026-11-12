import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/bits";
import { Spot } from "@/components/app/Illustrations";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import { progress, schools, student } from "@/data/scenario";
import mayaPhoto from "@/assets/maya.jpg";
import valleyHome from "@/assets/valley-home.jpg";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Profile — Trellis" },
      { name: "description", content: "Maya's student profile: schools, program, counselor and goals." },
      { property: "og:title", content: "Profile — Trellis" },
      { property: "og:description", content: "The student profile Sprout plans around." },
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
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" sub="From your school records." right={<Spot name="backpack" className="hidden w-32 sm:block" />} />
      <div className="surface relative flex items-center gap-4 overflow-hidden p-6 pr-20 sm:pr-6">
        <img src={valleyHome} alt="" className="profile-card-art" />
        <img src={mayaPhoto} alt="" className="relative size-16 rounded-full object-cover" />
        <div className="relative">
          <div className="text-lg font-medium">{student.name}</div>
          <div className="text-sm text-muted-foreground">Student ID 000-SYN-4471 · synthetic record</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(["bayview", "northgate"] as const).map((k) => (
          <div key={k} className="surface flex items-center gap-4 p-5">
            <SchoolLogo school={k} className="size-12" />
            <div>
              <div className="font-medium">{schools[k].name}</div>
              <div className="text-sm text-muted-foreground">{schools[k].role}</div>
              <div className="text-xs text-muted-foreground">{schools[k].system}</div>
            </div>
          </div>
        ))}
      </div>

      <dl className="surface mt-6 divide-y">
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
