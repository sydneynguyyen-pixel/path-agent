/**
 * What each host wrote about their listing, as it would read on their own page (all synthetic).
 * Shown in the "From the listing" part of the details, apart from anything Trellis adds.
 * Links use .example domains so nothing points at a real account.
 */
export type ListingLink = { kind: "instagram" | "discord" | "x" | "facebook" | "tiktok" | "linkedin" | "website"; label: string; url: string };
export type Listing = {
  /** The host's description, one paragraph per entry. */
  about: string[];
  /** "What you'll do" bullets, as the host lists them. */
  doing?: string[];
  /** Who the host is, in their own words. */
  host?: string;
  links?: ListingLink[];
};

export const listings: Record<string, Listing> = {
  "design-club": {
    about: [
      "We're Bayview's club for anyone curious about why some apps feel great and others make you want to throw your phone. No design experience needed, just bring your opinions.",
      "Every Tuesday we pick something people use every day (the campus parking app has been a favorite) and test it with real students. Then we sketch how we'd fix it, over snacks.",
    ],
    doing: ["Run quick five-person usability tests", "Sketch and prototype fixes in Figma", "Hear from local designers twice a quarter", "Build a case study for your portfolio by spring"],
    host: "Student-run since 2019. About 30 members from psychology, art, business and computer science.",
    links: [
      { kind: "instagram", label: "@bayview.peopleproducts", url: "https://instagram.example/bayview.peopleproducts" },
      { kind: "discord", label: "Club Discord", url: "https://discord.example/bayview-pnp" },
      { kind: "tiktok", label: "@bayviewpnp", url: "https://tiktok.example/@bayviewpnp" },
    ],
  },
  "ux-night": {
    about: [
      "Ever watched someone try to use something you built? It's humbling, hilarious and the fastest way to learn. Join us for an evening of live usability tests!",
      "Three local teams bring a product they're working on. Volunteers from the audience try it for the first time while everyone watches (kindly). Afterward we break into small groups and talk about what we saw and what we'd change.",
    ],
    doing: ["Watch three live usability sessions", "Practice taking notes like a researcher", "Meet designers and researchers working in Eastshore", "Pizza and drinks from 5:30, sessions start at 6"],
    host: "Eastshore Design Collective is a volunteer-run community for designers, researchers and the design-curious. Monthly events, always free.",
    links: [
      { kind: "instagram", label: "@eastshoredesign", url: "https://instagram.example/eastshoredesign" },
      { kind: "x", label: "@eastshoredesign", url: "https://x.example/eastshoredesign" },
      { kind: "website", label: "eastshoredesign.example", url: "https://eastshoredesign.example" },
    ],
  },
  "library-usability": {
    about: [
      "The Eastshore Public Library is redesigning its website, and we want to hear from the people who actually use it. We're hiring a summer intern to help us plan and run usability tests with library patrons.",
      "You'll work with our two-person web team, sit in on sessions at three branches, and help turn what we learn into changes that ship before fall.",
    ],
    doing: ["Recruit patrons and schedule test sessions", "Run and take notes on 20+ usability tests", "Summarize findings for the web team", "Present your recommendations to library leadership in August"],
    host: "Eastshore Public Library serves 180,000 residents across six branches. Interns are paid $19/hour.",
    links: [{ kind: "website", label: "eastshorelibrary.example/jobs", url: "https://eastshorelibrary.example/jobs" }],
  },
  "research-circle": {
    about: [
      "Interested in research but not sure where to start? The Student Research Circle is a friendly, low-pressure place to learn how real studies get made.",
      "Each quarter we design and run one small study together, start to finish. This fall: how students choose where to study on campus. Faculty mentors drop in to answer questions and share their own projects.",
    ],
    doing: ["Write survey questions and test them on each other", "Collect and clean real data", "Learn basic analysis in spreadsheets and R", "Present at the spring research symposium"],
    host: "Advised by Dr. Alvarez in Psychology. Open to every major; most members are first- or second-year students.",
    links: [{ kind: "instagram", label: "@bayviewresearchcircle", url: "https://instagram.example/bayviewresearchcircle" }],
  },
  "campus-survey": {
    about: [
      "The Bayview Office of Research runs a campus climate survey every two years to learn how students feel about belonging, safety and support on campus. We're looking for a student assistant to help with this year's round.",
      "You'll help rewrite questions so they're clear and fair, pilot the survey with student groups, and help spread the word so we hear from as many students as possible.",
    ],
    doing: ["Review and pilot survey questions", "Run short feedback sessions with student groups", "Track response rates by department", "Help write the student-facing summary"],
    host: "The Office of Research supports data-informed decisions across Bayview. Student assistants earn $18/hour and set their own schedule.",
    links: [{ kind: "website", label: "bayview.example/research", url: "https://bayview.example/research" }],
  },
  "survey-lab": {
    about: [
      "\"How satisfied are you with our amazing services?\" There's a reason that question is a problem. Come learn how to write survey questions that get honest answers.",
      "Bring a survey you've written, taken, or hated. We'll take apart real examples together and rewrite them in small groups. You'll leave with a checklist you can use on every survey from now on.",
    ],
    doing: ["Spot leading and double-barreled questions", "Rewrite a real survey with a partner", "Learn when to use scales and when to ask open questions", "Coffee and pastries provided"],
    host: "The Bayview Career Center helps students explore careers, build skills and connect with employers. All workshops are free for Bayview students.",
    links: [
      { kind: "instagram", label: "@bayviewcareers", url: "https://instagram.example/bayviewcareers" },
      { kind: "linkedin", label: "Bayview Career Center", url: "https://linkedin.example/bayview-career-center" },
    ],
  },
  "policy-committee": {
    about: [
      "The policy committee is where student ideas become campus rules. We research issues students care about, from textbook costs to late-night shuttle hours, and bring proposals to the Student Senate.",
      "You don't need to be elected to join. Committee members pick an issue, gather evidence, and write a short brief. Last year our brief on free menstrual products was adopted campus-wide.",
    ],
    doing: ["Research an issue students care about", "Survey students and read what other colleges did", "Write and present a policy brief", "Meet with administrators to make the case"],
    host: "Part of Bayview Associated Students. Meetings are open to every enrolled student.",
    links: [
      { kind: "instagram", label: "@bayviewasg", url: "https://instagram.example/bayviewasg" },
      { kind: "facebook", label: "Bayview ASG", url: "https://facebook.example/bayviewasg" },
      { kind: "website", label: "asg.bayview.example", url: "https://asg.bayview.example" },
    ],
  },
  "county-policy": {
    about: [
      "Want to see how a county decides where its money goes? The Eastshore County Budget Office is hiring a remote research intern for the summer.",
      "You'll help analyze spending data, compare our programs with similar counties, and draft short memos that go to the Board of Supervisors. We'll teach you R if you haven't used it.",
    ],
    doing: ["Clean and analyze county spending data in R", "Compare programs with neighboring counties", "Draft research memos for budget analysts", "Join weekly policy briefings"],
    host: "The Budget Office prepares Eastshore County's $1.2 billion annual budget. Interns are paid $20/hour and work fully online.",
    links: [{ kind: "website", label: "jobs.eastshore-county.example", url: "https://jobs.eastshore-county.example" }],
  },
  "r-group": {
    about: [
      "A friendly group for anyone learning R or using it every day. Beginners are especially welcome, and nobody will judge your messy code.",
      "Most weeks someone shares a short project, then we work through a public data set together. Bring a question or just come and listen.",
    ],
    doing: ["Short demos from members", "Live coding with Eastshore open data", "Help with your own projects in breakout rooms", "A shared library of beginner tutorials"],
    host: "Run by volunteers at Open Eastshore, a civic tech group that builds tools with the city's public data.",
    links: [
      { kind: "discord", label: "R Users Discord", url: "https://discord.example/eastshore-r" },
      { kind: "website", label: "openeastshore.example", url: "https://openeastshore.example" },
    ],
  },
  "civic-data": {
    about: [
      "Spend a Saturday morning making sense of your city! Civic Data Saturday pairs people up to explore a real Eastshore data set. This month: bus ridership and on-time arrivals.",
      "There's a beginner track in R and SQL with step-by-step guides, and an open track for people who want to dig deeper. At noon, each pair shares one thing they found.",
    ],
    doing: ["Work with a partner on real city data", "Follow a guided beginner track in R or SQL", "Share a finding in a two-minute lightning talk", "Breakfast burritos at 9:30"],
    host: "Open Eastshore is a volunteer civic tech group that builds tools with the city's public data.",
    links: [
      { kind: "instagram", label: "@openeastshore", url: "https://instagram.example/openeastshore" },
      { kind: "x", label: "@openeastshore", url: "https://x.example/openeastshore" },
      { kind: "website", label: "openeastshore.example", url: "https://openeastshore.example" },
    ],
  },
  "sql-sprint": {
    about: [
      "Learn SQL in six Fridays. The Data Club's sprint takes you from your first SELECT to joining tables and answering real questions with data.",
      "Each session is a short lesson and then a hands-on challenge with campus data, like which dining hall has the shortest lines. Work alone or with a partner, and mentors are there the whole time.",
    ],
    doing: ["Six weekly lessons with hands-on challenges", "Practice on real (anonymized) campus data", "Finish with a small project you can show", "Certificate of completion from the Data Club"],
    host: "Northgate Data Club has 120 members across majors. Transfer students admitted for next fall are welcome to join.",
    links: [
      { kind: "instagram", label: "@northgatedataclub", url: "https://instagram.example/northgatedataclub" },
      { kind: "discord", label: "Data Club Discord", url: "https://discord.example/northgate-data" },
    ],
  },
  "market-intern": {
    about: [
      "Harbor Grocery Co-op is owned by 4,000 members, and we want to understand them better. Our customer insights intern helps us learn what members buy, what they wish we carried, and why.",
      "You'll query our sales database with SQL, help run our annual member survey, and share what you find with the buying team.",
    ],
    doing: ["Write SQL queries against sales data", "Help analyze the member survey", "Build simple dashboards for store managers", "Get a 20% staff discount on groceries"],
    host: "Harbor Grocery Co-op has served Eastshore since 1976. Interns are paid $19/hour.",
    links: [
      { kind: "instagram", label: "@harborcoop", url: "https://instagram.example/harborcoop" },
      { kind: "website", label: "harborcoop.example/jobs", url: "https://harborcoop.example/jobs" },
    ],
  },
  "archive-volunteers": {
    about: [
      "Help us care for Eastshore's history! Volunteers sort, label and digitize donated photos, letters and maps so anyone can explore them online.",
      "No experience needed. We'll train you in how archivists handle and describe materials. Many volunteers say finding a 100-year-old photo of their own street is the best part.",
    ],
    doing: ["Sort and rehouse donated collections", "Scan photos and documents", "Write short descriptions for the online catalog", "Help at public open days"],
    host: "The Eastshore History Center is a nonprofit archive and museum run with the help of 60 volunteers.",
    links: [
      { kind: "instagram", label: "@eastshorehistory", url: "https://instagram.example/eastshorehistory" },
      { kind: "website", label: "eastshorehistory.example", url: "https://eastshorehistory.example" },
    ],
  },
  "museum-intern": {
    about: [
      "Go behind the scenes at the Valley Art Museum. Our collections intern helps the registrar care for and track 8,000 works of art.",
      "You'll help with condition checks, update catalog records, and prepare works for a fall exhibition. You'll learn how museums handle, store and document art.",
    ],
    doing: ["Help with condition reports on artworks", "Update records in our collections database", "Prepare works for the fall exhibition", "Shadow curators and conservators"],
    host: "The Valley Art Museum is a regional museum with free admission every first Thursday. Interns are paid $18/hour.",
    links: [
      { kind: "instagram", label: "@valleyartmuseum", url: "https://instagram.example/valleyartmuseum" },
      { kind: "website", label: "valleyart.example", url: "https://valleyart.example" },
    ],
  },
  "archives-day": {
    about: [
      "Once a year we open our storage rooms to the public. Come see what's behind the doors! Archivists will show you how they care for fragile photos, letters and maps.",
      "Try on the white gloves, see a 1906 city map up close, and bring a family photo to learn how to preserve it at home.",
    ],
    doing: ["Guided tours of the archive storage rooms", "Hands-on demos of how archivists handle materials", "Tips on saving your own family photos", "Meet volunteers and learn how to join"],
    host: "The Eastshore History Center is a nonprofit archive and museum run with the help of 60 volunteers.",
    links: [{ kind: "instagram", label: "@eastshorehistory", url: "https://instagram.example/eastshorehistory" }],
  },
  "nonprofit-eval": {
    about: [
      "Bay Neighbors Food Network delivers groceries to 300 families every week. We want to know what's working, what isn't, and how to do better. That's where you come in.",
      "Our program evaluation intern helps design short surveys and interviews with the families we serve, then helps us make sense of what we hear.",
    ],
    doing: ["Help design surveys and interview guides", "Talk with families at pickup sites", "Analyze results with our programs team", "Write a short report for our board"],
    host: "Bay Neighbors Food Network is a volunteer-powered nonprofit fighting hunger in Eastshore. Interns are paid $18/hour.",
    links: [
      { kind: "instagram", label: "@bayneighborsfood", url: "https://instagram.example/bayneighborsfood" },
      { kind: "facebook", label: "Bay Neighbors", url: "https://facebook.example/bayneighborsfood" },
      { kind: "website", label: "bayneighbors.example", url: "https://bayneighbors.example" },
    ],
  },
  dsgn20: {
    about: ["An introduction to human-centered design. Students learn to observe people, frame problems, generate ideas, prototype and test with users. Includes a team project with a community partner."],
    doing: ["Weekly studio sessions", "Usability testing with real users", "Team project with a local partner"],
  },
  psyc41: {
    about: ["How psychologists answer questions with evidence. Covers experiments, surveys, observation and interviews, plus research ethics and how to read a journal article. Students design and run a small study."],
    doing: ["Design a study and write a proposal", "Collect and analyze data", "Write an APA-style report"],
  },
  cis22: {
    about: ["Introduction to relational databases. Students design tables, write SQL queries, and use databases to answer questions about real data sets. No programming experience required."],
    doing: ["Weekly SQL labs", "Design a database for a small business", "Final project with a public data set"],
  },
  math17: {
    about: ["Data analysis using the R programming language. Covers importing and cleaning data, summaries, visualizations, and basic statistical tests. Designed for students with no coding background."],
    doing: ["Weekly R labs", "Visualize and summarize real data", "Final analysis project"],
  },
  "lcc-psyc20": {
    about: ["An overview of psychological disorders: how they are classified, assessed and treated. Explores research on causes and current approaches to care, with attention to culture and stigma."],
  },
  "lcc-libr10": {
    about: ["An introduction to archives, libraries and museum collections. Students learn how collections are acquired, described, preserved and made available, with visits to local archives."],
    doing: ["Field visits to local archives", "Describe and catalog a small collection"],
  },
  "rbc-soc31": {
    about: ["How organizations know whether their programs work. Students learn to write evaluation questions, choose methods, collect data and report findings, using case studies from nonprofits and government."],
    doing: ["Case studies from local nonprofits", "Plan an evaluation for a real program"],
  },
  "ecc-dsgn14": {
    about: ["A hands-on studio in UX research methods: interviews, usability testing, diary studies and synthesis. Students run a research project for a real product and present findings to its team."],
    doing: ["Run interviews and usability tests", "Synthesize findings with affinity mapping", "Present to a product team"],
  },
};
