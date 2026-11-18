# IBM Turbonomic for banking and financial markets

A scroll-driven story page built from the Figma file "Turbonomic Product Story" (page "05 Hi-fi Prototype v2").
Built with Vite, React, and Carbon (`@carbon/react`, g100 theme) with self-hosted IBM Plex Sans.

## Run it

```bash
npm install
npm run dev        # local preview at http://localhost:5173
npm run build      # production build in /dist
npm run preview    # serve the production build
```

Requires Node 18 or later.

## Where things live

| File | What it holds |
| --- | --- |
| `src/content.js` | All copy, footnotes, links, stats, and the demo URL. Edit text here, not in components. |
| `src/App.jsx` | Page layout and the seven scenes, built from Carbon components. |
| `src/components/Stage.jsx` | The pinned 3D stage: 27 isometric blocks whose state changes per scene, the layered view (scene 4), and the before/after slider (scene 6). |
| `src/components/SupplyChain.jsx` | Simplified Turbonomic supply chain panel (scene 4). |
| `src/styles/index.scss` | Carbon theme setup, layout, motion, and responsive rules. Uses Carbon tokens for type, spacing, and color. |
| `public/renders/` | Drop Blender renders here (see below). |

## How the scroll works

The copy scrolls on the left (columns 2–7 of Carbon's 16-column grid). The stage on the right is sticky.
Whichever scene crosses the middle of the screen sets the stage state, and CSS transitions animate the
blocks between states, using Carbon's expressive easing. Blocks move in a staggered ripple, each scene's
copy builds in piece by piece as it arrives, and the before/after slider wipes in once the stage settles.

Each scene's copy pins while you scroll through a buffer (`$scene-buffer` in `index.scss`), so scenes have weight.
The left-hand copy follows the Figma frames at 1440 × 900: Carbon heading-05 steps for headlines (48/56 at xlg)
and body-02 for paragraphs. In shorter windows the supply chain panel shrinks (to 60% at most) so its scene still pins.
If a scene can't fit (a very short window), it scrolls normally instead of pinning.
Below the `lg` breakpoint, each scene shows its own stage above the text. With "reduce motion" turned on,
all animation stops and each scene reads as a still.

## Swapping in Blender renders

1. Export a transparent PNG or WebP at 1440 × 1480 (twice the 720 × 740 stage).
2. Put it in `public/renders/`.
3. Add `render: 'renders/scene-01.png'` to that scene in `src/content.js` (or to a trade-off option).

Scenes without a `render` keep the animated blocks, so you can switch over one scene at a time.

## Links to check before sharing

- `DEMO_URL` in `src/content.js` points to the Turbonomic product tour on IBM TechZone.
- "Share this page" copies the page's own URL, so it works once the site is hosted.

## Deploying

The build uses relative paths (`base: './'`), so `/dist` runs from any folder: GitHub Enterprise Pages,
an internal static host, or a container on an OpenShift cluster.

## Sources cited on the page

- New Relic, financial services outage research, January 2026
- Flexera 2026 State of the Cloud Report
- IBM case studies: [Atruvia](https://www.ibm.com/case-studies/atruvia-turbonomic), [Metzler](https://www.ibm.com/case-studies/metzler)
