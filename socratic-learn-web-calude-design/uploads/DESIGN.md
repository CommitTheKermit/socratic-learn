# Design System Specification: The Ethereal Pulse

## 1. Overview & Creative North Star: "The Ethereal Pulse"
This design system is built to bridge the gap between high-fidelity editorial fashion and futuristic mobile interaction. Our Creative North Star, **"The Ethereal Pulse,"** dictates that the UI should never feel static or boxed-in. Instead, it should feel like a living, breathing digital dreamscape where music and language collide.

We move beyond the "standard dark mode" by utilizing a pure-black void (`surface-container-lowest`) contrasted against hyper-vibrant, iridescent holographic elements. By embracing intentional asymmetry—such as oversized display type and overlapping glass surfaces—we create a signature experience that feels premium, Gen-Z focused, and unapologetically bold.

## 2. Colors & Surface Logic
The palette is rooted in deep obsidian tones, punctuated by a signature "Holographic Gradient" that serves as the system's emotional heartbeat.

### The Holographic Signature
The core interactive brand element is a diagonal gradient (top-left to bottom-right): 
`Mint (#A8FFC9)` → `Cyan (#7DE3FF)` → `Lavender (#C8B6FF)` → `Pink (#FFB3D9)`.
*   **Usage:** Only for Primary CTAs, active states, and high-impact progress indicators.
*   **Contrast:** All text placed on this gradient must use `on-primary-container (#002730)` for maximum legibility and a sophisticated "dark-on-light" look.

### The "No-Line" Rule
**Strict Mandate:** Prohibit the use of 1px solid borders for sectioning or containment. 
*   Boundaries are defined exclusively through background color shifts. Use `surface` (#0E0E0E) as your base and `surface-container` (#191919) for secondary sections. 
*   Visual separation is achieved through vertical rhythm (white space) and tonal transitions, never lines.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested physical layers:
1.  **Level 0 (The Void):** `surface-container-lowest (#000000)` - Used for the main background to make the OLED screen disappear.
2.  **Level 1 (The Stage):** `surface (#0E0E0E)` - Used for the main content areas.
3.  **Level 2 (The Card):** `surface-container (#191919)` - Used for elevated interactive modules.
4.  **Level 3 (The Floating Glass):** Use `surface-bright (#2C2C2C)` at 60% opacity with a 20px Backdrop Blur.

## 3. Typography: Editorial Authority
We use **Plus Jakarta Sans** for its geometric clarity and modern "tech-chic" feel.

*   **Display & Headlines:** Use `display-lg` (3.5rem) and `headline-lg` (2rem) to create a "Zine-style" layout. These should be set with tight letter-spacing (-0.02em) and 100% white (`on-background`) to punch through the dark theme.
*   **The Narrative Scale:** Typography is our primary tool for hierarchy. Use `title-lg` for song lyrics and `body-lg` for translations. Avoid using "labels" for anything other than utility meta-data.
*   **Asymmetry:** Don't be afraid to left-align a massive headline while right-aligning the sub-text. This breaks the "template" feel and adds a custom, curated vibe.

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are largely banned. Depth is a result of light and translucency.

*   **The Layering Principle:** Place a `surface-container-high` card inside a `surface` section. The subtle shift from #1F1F1F to #0E0E0E provides all the "lift" necessary.
*   **Ambient Shadows:** If an element must float (e.g., a music player bar), use a shadow with a 40px blur, 0px offset, and 8% opacity. The shadow color should be tinted with `secondary` (#C8B6FF) to simulate the iridescent glow of the holographic elements hitting the black surface.
*   **The Ghost Border:** For accessibility on interactive fields, use the `outline-variant` (#484848) at **15% opacity**. This creates a "suggestion" of a container without breaking the fluid aesthetic.

## 5. Components
All components follow a **Pill (Full Radius)** or **Soft-Square (16dp)** logic.

*   **Primary Action Buttons:** Pill-shaped (`9999px` radius). Filled with the **Holographic Gradient**. Text is Bold `label-md` in `on-primary-container`.
*   **Secondary "Glass" Buttons:** Pill-shaped. Background is `surface-bright` at 20% opacity with a `20px` backdrop-blur. 
*   **Lyric Cards:** `16dp` corner radius. Use `surface-container-high`. No dividers between lines of text; use `12px` of vertical spacing to separate original lyrics from translated vocab.
*   **Vocabulary Chips:** Pill-shaped. Use `secondary-container` (#4C3C7C) with `secondary` (#C8B6FF) text. These should feel like "gems" scattered on the dark interface.
*   **Progress Bars:** The track should be `surface-variant`. The "filled" portion must be the **Holographic Gradient**.
*   **Input Fields:** Ghost-style. No background fill. Only a bottom "Ghost Border" (15% opacity) that animates to 100% opacity `primary` (#76DDF8) on focus.

## 6. Do's and Don'ts

### Do:
*   **Do** use extreme scale. A 32sp title next to a 12sp label creates high-end drama.
*   **Do** let the background "breathe." Use generous margins (24dp+) to ensure the "Zenly" premium feel.
*   **Do** use Glassmorphism for overlays (Modals, Bottom Sheets) to maintain a sense of context.

### Don't:
*   **Don't** use pure grey (#808080). Always use the themed neutrals (`on-surface-variant` #ABABAB).
*   **Don't** use standard Material Design dividers. If you feel the need for a line, use a 16dp gap instead.
*   **Don't** center-align long blocks of text. Keep it left-aligned for an editorial, sophisticated look.
*   **Don't** use high-opacity shadows. If the shadow is obvious, it's too heavy.

## 7. Interaction Design (The "Dreamy" Feel)
*   **Micro-interactions:** Elements should "float" into place with a slight overshoot (Spring physics: Damping 0.8, Stiffness 120).
*   **Holographic Hover:** When a user hovers or taps a card, the `surface-tint` (#76DDF8) should subtly glow at 5% opacity, making the card feel reactive to the user's touch.