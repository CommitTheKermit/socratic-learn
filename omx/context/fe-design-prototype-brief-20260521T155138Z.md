# Context Snapshot: FE Design Prototype Brief

## Task statement
Create a planning/specification document for a FE-focused design prototype, using the existing ClaudeCode-oriented project plans/specs in `.omc` as source material. The user intends to turn that brief into a design via Claude Design.

## Desired outcome
An execution-ready Korean planning brief for a design prototype: likely screens, flows, content hierarchy, visual/interaction requirements, constraints, and acceptance criteria for a prototype generation tool.

## Stated solution
Use the existing `.omc` ClaudeCode-based plan/spec as input, then produce a FE design prototype planning document.

## Probable intent hypothesis
The user wants to bridge engineering specs into a design-oriented artifact that Claude Design can consume, without prematurely implementing code.

## Known facts/evidence
- `.omc/specs/deep-interview-socratic-learn-web.md`: product spec for Socratic Learn web service. Core UX: login, one-line concept input, SSE explanation/question stream, per-question text boxes, batch submit, grading signals, branch cards, session history/replay/resume.
- `.omc/plans/consensus-socratic-learn-web-mvp.md`: MVP plan emphasizing two product values: reduce CLI input friction and enable permanent learning-history review. Tech locks include CMP Web, Ktor, Supabase, Claude API, but design brief may not need implementation detail.
- `.omc/specs/deep-interview-hackathon-5h-4person.md` and `.omc/plans/consensus-hackathon-5h-4person.md`: hackathon execution scope. P1 demo: concept input → SSE streaming → render explanation/questions → answer text boxes → submit answers. Login/auth and persistence are removed for 5h demo.

## Constraints
- The requested artifact is design-planning oriented, not implementation.
- User mentioned Claude Design as downstream consumer.
- Existing project language/UX is Korean-first.
- Existing product differentiators: GUI reduces CLI friction; permanent history enables review/resume.

## Unknowns/open questions
- Which scope should the prototype represent: full MVP product or 5-hour no-auth demo slice?
- Desired artifact format/path/name.
- Visual style direction and fidelity level.
- Which screens must be included in the first design prototype.
- Non-goals and decision boundaries for visual/UX decisions.

## Decision-boundary unknowns
- Whether the agent may choose IA/screen list, copy tone, layout pattern, design system, and prototype flow without further confirmation.
- Whether auth/history/BYOK/token limits are included in the design prototype or deferred.

## Likely codebase touchpoints
- `.omc/specs/deep-interview-socratic-learn-web.md`
- `.omc/plans/consensus-socratic-learn-web-mvp.md`
- `.omc/specs/deep-interview-hackathon-5h-4person.md`
- `.omc/plans/consensus-hackathon-5h-4person.md`
- Future artifact likely under `.omc/specs/`, `.omc/plans/`, or `.omx/specs/` depending user preference; no code changes expected in deep-interview.

## Prompt-safe initial-context summary status
not_needed
