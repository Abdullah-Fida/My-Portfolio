# My-Portfolio

Portfolio of **Abdullah Fida**: Shopify stores, custom web apps and AI automation.

Built with React 19, TypeScript, Vite, Three.js / React Three Fiber, GSAP (ScrollTrigger + SplitText) and Lenis smooth scrolling.

## Highlights

- **3D hero**: a ring of curved screens showing real captures of live projects, rendered with a custom GLSL shader (rounded corners, scroll-reactive bend + RGB shift, hover glow, depth fade). Drag to spin, click a screen to open the case study.
- **Pinned horizontal "Selected work"** gallery with parallax images on desktop; a vertical stack on mobile.
- **Interactive walkthroughs** for the gym access system and AI publishing / clipping automations.
- Word-by-word scroll reveal, line-mask headline reveals, count-up stats, magnetic CTA, custom cursor, preloader.
- Real GitHub contribution calendar, live site previews (where the site allows framing), downloadable CV.
- Respects `prefers-reduced-motion`; WebGL pauses when the hero is off-screen and falls back to an image if WebGL fails.

## Run locally

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview
```

## Editing content

All project text, links and services live in `src/content.ts`. The 3D ring's screens are the `heroPanels` list in the same file.

## Design

- Type: Clash Display (headlines), Satoshi (text), system mono (labels)
- Colour: ink `#0b0b0c`, paper `#eeece6`, ember accent `#ff5b2e`
