import { useEffect, useState, type ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { student } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { cn } from "@/lib/utils";
import valleyHome from "@/assets/valley-home.jpg";
import { AgentAvatar } from "./Brand";
import { PathLoader, Spot } from "./Illustrations";
import { SchoolLogo } from "./SchoolLogo";

type BlankPageContent = { spot: ComponentProps<typeof Spot>["name"]; title: string; body: string };

const noSkills: BlankPageContent = { spot: "books", title: "No skills yet", body: "When you build your path, I'll find them in your syllabi." };

/** What each data-driven page shows before the student's path exists. */
export const blankPages: Partial<Record<string, BlankPageContent>> = {
  "/semester": { spot: "bridge", title: "Your terms will appear here", body: "Build your path to see every term from now until you graduate." },
  "/portal": { spot: "signpost", title: "Build your path first", body: "I need to know what counts toward your transfer before I can help when a class is full." },
  "/skills": noSkills,
  "/skills-export": noSkills,
  "/course-skills": noSkills,
  "/activity": { spot: "journal", title: "Nothing has happened yet", body: "Everything your helpers do will be recorded here." },
};

export function BlankPage({ spot, title, body }: BlankPageContent) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <Spot name={spot} className="w-36" />
      <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Button className="mt-6" asChild><Link to="/">Build my path <ArrowRight className="size-4" /></Link></Button>
    </div>
  );
}

const BUILD_STEPS = ["Reading your transcript", "Matching classes to Northgate's requirements", "Mapping out your terms", "Finding skills in your syllabi"];
const BUILD_STEP_MS = 900;

const promises = [
  { spot: "bridge", title: "Your path to Northgate", body: "Every class, term by term, and what each one counts for." },
  { spot: "signpost", title: "Backups when a class is full", body: "Options that still count, ready in minutes." },
  { spot: "books", title: "Skills from your classes", body: "A resume list that you confirm yourself." },
] as const;

/** Home before the path exists: one action, then the first read of the student's records. */
export function BlankHome() {
  const { finishBuild } = useJourney();
  const [finished, setFinished] = useState<number | null>(null);

  useEffect(() => {
    if (finished === null) return;
    const t = finished < BUILD_STEPS.length ? setTimeout(() => setFinished(finished + 1), BUILD_STEP_MS) : setTimeout(finishBuild, 500);
    return () => clearTimeout(t);
  }, [finished, finishBuild]);

  return (
    <div className="space-y-8">
      <div className="home-cover">
        <img src={valleyHome} alt="" className="home-cover-art" width={1376} height={768} />
        <div>
          <h1 className="home-greeting font-semibold">Hi {student.name.split(" ")[0]}, let's map your path.</h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <SchoolLogo school="bayview" className="size-6" /> Bayview CC
            <ArrowRight className="size-4" />
            <SchoolLogo school="northgate" className="size-6" /> Northgate State · Psychology B.A.
          </div>
        </div>
        <div className="home-cover-card">
          {finished === null ? (
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-5 shadow-frame">
              <AgentAvatar agent="reader" bare />
              <div className="min-w-0 flex-1">
                <div className="aqua-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold">Start here</div>
                <div className="mt-2 text-lg font-semibold">Build your path</div>
                <p className="mt-1 text-sm text-muted-foreground">Your schools are connected. When you're ready, I'll work out what counts toward your transfer.</p>
              </div>
              <Button onClick={() => setFinished(0)}>Build my path <ArrowRight className="size-4" /></Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 rounded-2xl border bg-card p-5 shadow-frame" role="status">
              <PathLoader />
              <ul className="space-y-2 text-sm">
                {BUILD_STEPS.map((label, i) => (
                  <li key={label} className={cn("flex items-center gap-2 transition-colors", i > finished && "text-muted-foreground/50", i === finished && "font-medium")}>
                    <Check className={cn("size-4 text-mark-yes transition-opacity", i < finished ? "opacity-100" : "opacity-0")} />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-3xl gap-8 pt-16 text-center sm:grid-cols-3">
        {promises.map((p) => (
          <div key={p.title}>
            <Spot name={p.spot} className="mx-auto h-20 w-auto" />
            <div className="mt-3 text-sm font-medium">{p.title}</div>
            <p className="mt-1 text-xs text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
