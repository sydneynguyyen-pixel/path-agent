# Brand styling review

## Changed components and pages
- Shared `BrandLogo`, `AgentAvatar`, `MeshTile`, `SubjectIcon`, `TermIcon`; new shared subject and season tagging. Agent colors fill the supplied characters themselves, not their surrounding circles, per follow-up feedback.
- `Shell`: monochrome frame, black selected navigation, logo, aqua watching chip, understated reset.
- `Button`, `TabsList`, `TabsTrigger`: pill shapes, black selection, focus states.
- `ConfidenceBadge`: softly tinted pills with readable labels/icons and dark text.
- `Home`, `Attention`, `PathTimeline`: greeting typography, quiet attention surface, mascot, seasonal header bands, consistent course tiles.
- `Semester`: season icons in term selectors and subject tiles beside courses; quiet deadline surfaces.
- `AgentPanel`, availability/approval/recovery surfaces: shared mascots, subject tiles, rounded surfaces and monochrome text.
- `Activity`, `Timeline`, `EventCard`, `Decisions`: mascot identities and spacious rows.
- `Controls`: agent mascots, aqua approval chips, coral blocked chips.
- `Welcome`: blob logo, mascots, monochrome setup surfaces.
- `Counselor`: drafter identity, subject tile, branded empty state and review surfaces.
- `Profile`, `Settings`, `Sources`: inherit global type, surfaces, neutral fills and spacing; content preserved.
- Registration launch/loading/dock: blob logo and Reader mascot. Institutional school content stays separately scoped.
- Root font loading adds Geist 700; missing leaf social metadata completed without changing visible copy.
- Favicon matches the blob logo with a small graduation cap.

## Deliberate exceptions for review
- The existing labeled sidebar and navigation structure are preserved rather than replacing them with an 84px icon rail; the brief explicitly says to retain layouts/navigation.
- The existing progress bar remains a bar, now aqua, rather than being replaced by a ring.
- Lucide remains for navigation, actions, evidence, permissions, completion/error/loading indicators. These are functional icons, not course or agent identity icons.
- Original school and vendor logos remain unchanged, including their intrinsic colors.
- The school portal intentionally retains institutional Arial, navy/gold colors, dense tables, compact controls and calendar blocks.
- The standalone favicon uses literal black/white because it cannot inherit the app's CSS tokens.
- `src/lib/error-page.ts` retains its standalone fallback-page colors and system font; it is not the styled React error/empty state and is outside the normal app frame.
- Existing semantic utility names such as `bg-lilac` remain in some markup but resolve to neutral theme tokens; they no longer produce purple app surfaces.

## Verification
- Existing confidence, activity and routing tests passed.
- New tests cover prefix-first tags, unknown-subject fallback, and season tags.
- Browser checks opened every content page and completed MATH 13 search → Add → Submit → seat secured, then reset.
- Desktop and phone views inspected; no browser page errors in the checked flow.