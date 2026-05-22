# Context Snapshot: Implementation Sequence by Role

## Task statement
User wants an ordered list of implementation features and ordered implementation goals by field/role: FE, BE, QA, PM, based on `.omc` plans/specs.

## Desired outcome
A clear Korean role-by-role implementation roadmap that resolves confusion about what to build first, and why, from the existing `.omc` artifacts.

## Stated solution
Use `.omc` plans/specs as source of truth and organize the implementation sequence by FE, BE, QA, PM.

## Probable intent hypothesis
The user needs a practical project setup/execution guide for a team, likely bridging the full MVP plan and the 5-hour hackathon/P1 plan.

## Known facts/evidence
- `.omc/specs/deep-interview-socratic-learn-web.md`: full MVP product spec. Includes login/auth, one-line concept input, SSE learning cycle, answer inputs, grading/branching, session history, token cap, future BYOK.
- `.omc/plans/consensus-socratic-learn-web-mvp.md`: full MVP plan. Emphasizes two values: CLI input friction reduction and permanent history/review. Includes M0 spikes, shared contract, auth, LLM cycle, persistence, history, quota, dogfooding.
- `.omc/specs/deep-interview-hackathon-5h-4person.md`: 5h/4-person no-auth demo spec. P1 demo is concept input -> SSE streaming -> question textboxes -> answer submit.
- `.omc/plans/consensus-hackathon-5h-4person.md`: role split for FE/BE/Shared/QA in a 5-hour local demo. PM is not explicit, but Shared/designated merger + QA/coordination duties can be adapted into PM/Tech Lead tasks.

## Constraints
- The user asked via `$deep-interview`; do not implement code directly.
- Need one focused clarification question before final artifact if scope would change the sequence materially.
- Output should be practical, ordered, and role-specific.

## Unknowns/open questions
- Should the roadmap be for full MVP, 5-hour hackathon demo, or two-tier (P1 first, then full MVP)?
- Should PM mean product manager/project manager, or Shared/merger/tech lead from the `.omc` docs?

## Decision-boundary unknowns
- Whether agent may merge PM + Shared responsibilities into one role.
- Whether agent may down-scope auth/history/quota to later phases by default.

## Likely codebase touchpoints
- `.omc/specs/deep-interview-socratic-learn-web.md`
- `.omc/plans/consensus-socratic-learn-web-mvp.md`
- `.omc/specs/deep-interview-hackathon-5h-4person.md`
- `.omc/plans/consensus-hackathon-5h-4person.md`
- Potential output artifact: `.omx/specs/deep-interview-implementation-sequence-by-role.md` or `.omc/plans/implementation-sequence-by-role.md`

## Prompt-safe initial-context summary status
not_needed
