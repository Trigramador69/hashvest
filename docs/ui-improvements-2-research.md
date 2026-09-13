# UI improvements 2: minimal dashboard motion research

Date: 2026-09-13

## Recommendation

Use CSS-only micro-interactions for this dashboard request. The repository already
has the relevant motion tokens (`120ms`, `180ms`, `280ms`), CSS transitions in its
button/card primitives, and a strict rule of a 1px hover lift/border change without
scaling ([`design.md`](../design.md#27-visual-qa--checklist-de-aceptacion)). Keep
motion subordinate to information hierarchy: feedback for hover, focus, pressed,
loading, and successful state changes; no continuous dashboard-wide movement,
parallax, animated KPI counting, or chart redraw on first render.

MDN describes CSS transitions as transitions between two element states, and CSS
animations as a no-JavaScript option that the browser can optimize. That is enough
for the proposed color, border, opacity, and 1px `translate` effects:
[MDN: `transition`](https://developer.mozilla.org/en-US/docs/Web/CSS/transition),
[MDN: Using CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Animations/Using).

## CSS-only versus a dependency

| Option                    | Fit for HashVest now                                                                                                                                                                                                                                                                        | Cost/risk                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CSS transitions/keyframes | Best fit for hover/focus, small state feedback, and a restrained one-time reveal. No new dependency, no animation runtime, works with the existing Tailwind/global CSS setup, and keeps the dashboard's data projection deterministic.                                                      | CSS is less convenient for interruptible sequences, coordinated layout transitions, gesture choreography, and complex SVG timelines. Those are not part of this request.                                                                                                                                                                                                                                           |
| GSAP                      | Technically viable: the official docs describe it as framework-agnostic and installable from npm ([GSAP installation](https://gsap.com/docs/v3/Installation/)).                                                                                                                             | Adds JavaScript and dependency surface for effects CSS already expresses. React/Next integration would need client-side lifecycle/cleanup discipline; reduced-motion behavior and screenshot control would be another policy to maintain. Not justified for this scope.                                                                                                                                            |
| Motion for React          | More React-native than GSAP for declarative variants, gestures, and layout animation. It supports the Next App Router, including a client-oriented import ([installation](https://motion.dev/docs/react-installation), [motion component](https://motion.dev/docs/react-motion-component)). | Still adds a dependency and client animation machinery. The official docs put the standard `motion` component around 34kb before the smaller `LazyMotion` route; that is disproportionate to a few CSS state transitions ([bundle-size guidance](https://motion.dev/docs/react-reduce-bundle-size)). Consider only if the product later needs coordinated enter/exit, gestures, or interruptible layout animation. |

## SSR, hydration, and reduced motion

- Next App Router pages/layouts are Server Components by default; browser APIs,
  state, event handlers, and effects belong in Client Components ([Next: Server and
  Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)).
  CSS-only state styling avoids introducing a new client-only boundary. If a future
  animation needs JavaScript, preserve identical server/client initial markup;
  React specifically warns that differing initial output breaks hydration assumptions
  ([React: `useEffect`](https://react.dev/reference/react/useEffect)).
- Honor `prefers-reduced-motion: reduce` globally. MDN says the preference requests
  removing, reducing, or replacing non-essential motion, and identifies scaling and
  large panning as possible vestibular triggers ([MDN: `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/%40media/prefers-reduced-motion)).
  For this dashboard, reduce or remove transforms and reveal movement; retain
  immediate state/color/border feedback where it communicates interaction. Do not
  rely on JavaScript-only detection for the basic policy.
- If Motion is ever introduced, its official `useReducedMotion`/`reducedMotion`
  APIs can react to the device preference and disable transform/layout animation
  while preserving selected opacity/color transitions ([Motion accessibility](https://motion.dev/docs/react-accessibility)).
  That is useful capability, but not a reason to add Motion for CSS-sized work.

## Deterministic Playwright screenshots

The current visual tests already pass `animations: "disabled"`. Playwright documents
that this stops CSS animations, CSS transitions, and Web Animations; finite effects
are fast-forwarded and infinite effects are canceled for the capture, and screenshot
assertions wait for two consecutive identical screenshots ([Playwright: `toHaveScreenshot`](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1)).
Keep that option on every visual assertion. Prefer finite, non-layout-shifting
interactions and stable fixture data. Do not make screenshot correctness depend on
wall-clock time, random delays, `requestAnimationFrame` state, or an animation
completion callback.

## Dashboard usability and scope guard

Good candidates are: border/background-color transitions on links, cards, tabs, and
buttons; a 1px panel lift only where the element is genuinely interactive; focus
visibility; and short opacity feedback for a completed local UI state. Avoid scaling
cards, moving charts or data-art continuously, animating numeric values that users
need to read, and hiding live chain/read errors behind transitions. Motion must not
change hit targets, layout, reading order, or the authority of HSK-derived values.

The official shadcn chart and select docs were consulted for the separate UI
requirements in this slice: the dashboard now composes Recharts through the
shared `ChartContainer`, and the language control uses the Radix-backed `Select`
primitive while preserving the existing locale boundary. RainbowKit remains the
wallet state owner; only its triggers are styled locally. Those dependencies were
not added for animation, and the CSS-only motion decision remains independent.

## Decision boundary

Implement CSS first, using the existing tokens and explicit properties rather than
`transition: all`. Add GSAP or Motion only after a concrete requirement appears for
sequenced/interruptible choreography, gesture physics, or complex layout/SVG
orchestration, with a separate bundle, SSR, reduced-motion, and visual-test review.
