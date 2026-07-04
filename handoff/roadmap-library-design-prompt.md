# claude.ai/design 프롬프트 - 로드맵 라이브러리 화면

아래 내용을 claude.ai/design 에 붙여넣어 시안을 만든 뒤 핸드오프하세요.

---

Design a new screen called **"로드맵 라이브러리" (Roadmap Library)** for an existing Korean web app named **Socratic** - a Socratic-method learning tool. This screen lets a user browse **ready-made official learning roadmaps** curated by the operator and start one with a single click. The app is in **Korean**; all UI copy must be Korean.

## What this screen does (context)

The app normally has users type a concept, take a short diagnostic, then learn through an AI-generated roadmap. This new screen is a shortcut: it shows a catalog of **pre-built roadmaps** (the first batch is 10 Android-development roadmaps). Clicking **"시작"** copies that roadmap into the user's own account as a new, editable learning session and drops them straight into the lesson - no diagnostic step.

## Screen anatomy

It lives inside the existing app shell (left sidebar 260px + main content area). Design **only the main content area** for this screen.

1. **Header block**
   - Title: `로드맵 라이브러리`
   - Subtitle (one line, muted): something like `바로 시작할 수 있는 준비된 학습 로드맵`
2. **Subject grouping** - roadmaps are grouped by subject. Show a **section header per subject** (e.g. a chip/label `안드로이드`) so it scales when more subjects are added later. First batch: all under `안드로이드`.
3. **Roadmap cards** in a responsive grid (desktop 2-3 columns, tablet 2, mobile 1). Each card shows:
   - **Title** (e.g. `안드로이드 플랫폼과 앱 기초`) - strong, 1-2 lines
   - **Summary** - 2-3 line description, muted, clamped with ellipsis
   - **Meta row** in mono font: step count + prereq indicator, e.g. `6단계 · 선행 개념 포함`
   - A small **subject badge/chip** (e.g. `안드로이드`)
   - Primary action button **`시작`** (the hero action of the card)
4. **States** - design all three:
   - **Loaded**: grid of cards
   - **Loading**: skeleton cards matching the card box model (title bar + 2 summary bars + meta bar)
   - **Empty**: quiet centered message `아직 공개된 로드맵이 없습니다`

## Entry point

Also show how the user reaches this screen: a **sidebar nav item** `로드맵 라이브러리` placed just under the existing `새로 학습하기` item (same `sb-item` style, with a distinct icon - a stack/collection/map icon).

## Design system - MATCH THIS EXACTLY (dark theme)

The app is a polished **dark** UI. Reuse these exact tokens (do not invent a new palette):

```
--bg:          oklch(0.135 0.005 270)   /* page background */
--bg-elev-1:   oklch(0.165 0.006 270)   /* card surface */
--bg-elev-2:   oklch(0.195 0.007 270)   /* raised/hover surface */
--line:        oklch(1 0 0 / 0.07)      /* hairline borders */
--line-3:      oklch(1 0 0 / 0.12)      /* stronger border */
--fg:          oklch(0.97 0 0)          /* primary text */
--fg-mut:      oklch(0.97 0 0 / 0.58)   /* secondary text */
--fg-dim:      oklch(0.97 0 0 / 0.36)   /* tertiary / meta */
--fg-faint:    oklch(0.97 0 0 / 0.18)
--accent:      oklch(0.62 0.17 273)     /* violet accent */
--accent-soft: oklch(0.62 0.17 273 / 0.18)

/* Signature holographic gradient - use for the primary/hero accent (e.g. the 시작 button or a subtle card highlight). Use sparingly, it is the brand signature. */
--holo: linear-gradient(135deg, #A8FFC9 0%, #7DE3FF 35%, #C8B6FF 70%, #FFB3D9 100%);
--holo-on: #002730;   /* text color on top of the holo gradient */

--radius-sm: 8px;  --radius: 10px;  --radius-lg: 14px;  --radius-xl: 22px;
--font-sans: "Pretendard Variable", Pretendard, system-ui, sans-serif;   /* all UI text */
--font-mono: "JetBrains Mono", ui-monospace, monospace;                  /* meta rows / counts only */
```

Visual language cues from the existing app:
- Cards: `--bg-elev-1` surface, `1px solid var(--line)` border, `--radius-lg` or `--radius-xl` corners, subtle hover lift to `--bg-elev-2`.
- Meta text uses the mono font at ~10.5-12px, `--fg-dim`, letter-spacing slightly loose.
- Titles: Pretendard, ~15-18px, weight 600-650, letter-spacing `-0.01em`.
- Body/summary: ~13px, line-height ~1.55, `--fg-mut`, Korean word-break (`word-break: keep-all`).
- The holographic gradient is the brand signature - the `시작` button can use `--holo` background with `--holo-on` text, or keep buttons on `--accent` and reserve holo for one focal highlight. Show one tasteful use.
- Keep it calm and editorial, not flashy. Generous spacing, clear hierarchy.

## Deliverables

- The **로드맵 라이브러리 main content** in loaded, loading (skeleton), and empty states.
- The **sidebar entry item** in its normal and active states.
- **Responsive**: desktop multi-column grid and mobile single-column stack.
- Everything in **Korean**, dark theme, matching the tokens above.

Sample data to populate the cards (real roadmap titles + summaries from the app):
- `안드로이드 플랫폼과 앱 기초` - 안드로이드의 플랫폼 계층 구조, ART 실행 방식, APK/AAB 패키징, 앱 샌드박스와 권한, 프로세스 생명주기, 리소스 한정자를 메커니즘 중심으로 익힌다. - `6단계 · 선행 개념 포함`
- `액티비티 생명주기` - 액티비티가 생성되고 소멸하기까지의 콜백 흐름과 상태 저장/복원을 다룬다. - `6단계 · 선행 개념 포함`
- `Jetpack Compose 기초` - 선언형 UI, 상태 호이스팅, 리컴포지션을 처음부터 익힌다. - `6단계 · 선행 개념 포함`
- `코루틴과 비동기` - suspend 함수, 구조적 동시성, 디스패처를 다룬다. - `6단계 · 선행 개념 포함`
(all under subject `안드로이드`)
