# Korean and English learning

## Language policy

- A saved `ko` or `en` preference takes priority.
- Otherwise, the browser's primary language selects Korean for `ko` and `ko-*`; every other language selects English. No IP or country lookup is used.
- The home and introduction pages provide a native language selector. It saves `socratic.language` in localStorage and reloads the page, including static UI copy. The existing concept draft is retained.
- Saved explanations, questions and learner answers remain in their original language. Newly generated content uses the selected language. Existing sessions are not translated or regenerated when the language changes.
- The document language and title follow the selected language.

## UI and API

`frontend/src/i18n/english.ts` contains English application copy. Translation is applied at application-copy call sites, never to arbitrary user content or DOM text. English answer placeholders use a dedicated short pool. The introduction page identifies its existing screenshots as Korean examples.

`frontend/src/api/contract.ts` is the request contract. Learning requests accept optional `language: "ko" | "en"`. Older clients that omit it retain Korean output. Both JSON and streaming clients send the preference.

`functions/src/outputLanguage.ts` applies the selected language to system prompts and schema descriptions. It removes conflicting Korean-only output constraints for English requests. Questions, explanations, choices, feedback, prerequisite suggestions and follow-up answers use the selected language; JSON keys, IDs, enums, code and equations remain unchanged. Learners may answer in either language.

Prepared roadmap GET requests accept `language`. The English versions retain the curated topic and step order in `functions/src/englishRoadmaps.ts`; bodies and check-in questions are generated in English when each step opens. Korean source documents are not modified. A future roadmap without an English outline is excluded from the English listing until its translation is added.

## Verification (2026-10-01)

- Frontend TypeScript and production build; Functions TypeScript build.
- Frontend: 795 passing tests. Functions: 41 passing tests.
- Frontend tests run with `VITE_FIREBASE_MEASUREMENT_ID=''` to isolate existing analytics tests from the local analytics configuration.
- `bash frontend/e2e/run.sh english-learning.cjs`: passed with real AI requests through local Functions, Auth and Firestore emulators.
- Browser checks: initial English selection, Korean override, reload persistence, concept draft preservation, English probe, outline, streamed explanation, questions, evaluation and follow-up answer.
- Mobile browser checks: a Japanese browser defaults to English; home and introduction pages fit a 390px viewport.
- Browser requests directly to Anthropic: zero.
- A saved-session integration test confirms that original Korean content and learner answers survive while new English feedback is displayed.

## Production deployment (2026-10-01)

- Released v0.22.0 to Firebase Functions and Hosting at https://socratic-learn-web.web.app.
- Firebase CLI completed successfully for both targets.
- The live JavaScript asset matched the local production build byte for byte and contained version 0.22.0.
- The same browser learning flow passed against production: language detection and persistence, draft preservation, English diagnostic questions, roadmap, streamed explanation, answer evaluation and follow-up answer.
- A Japanese mobile browser defaulted to English; home and introduction pages fit the viewport.
- Analytics collection requests were blocked during the production browser check. Direct browser requests to Anthropic: zero.
- Existing Node.js 20 runtime warning: the deployment CLI reports decommissioning on 2026-10-30. Runtime migration is outside this English-support release.
