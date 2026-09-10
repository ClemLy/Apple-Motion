# Apple Motion

An independent showcase of Apple product design. Five products, each rendered
offline into a 180-frame sequence and played back on a 2D canvas under your
scroll.

> **Not affiliated with Apple Inc.** This is a personal, non-commercial project
> built to explore product presentation on the web. Product names are used
> descriptively and remain the property of their respective owners. The site
> carries its own mark rather than Apple's.

---

## Why sequences, not real-time 3D

This started as a real-time WebGL build — the models are right there, and
rendering them live buys interactivity for free. It was rebuilt as pre-rendered
sequences, and the reason is worth stating plainly because it inverts the usual
advice.

The case for real time rested entirely on one feature: a finish picker that
recoloured each product. That is what makes sequences impossible — five products
times four finishes times a hundred and eighty frames is 3,600 images. Drop the
picker, and the argument collapses: one sequence per product is 180 images, and every reason
to prefer real time goes with it.

What pre-rendering buys, in exchange:

| | Real-time WebGL | Pre-rendered sequences |
|---|---|---|
| Payload | 15.8 MB of geometry + textures | ~23 MB of WebP, fetched one product at a time |
| Runtime cost | Continuous GPU work, one context | `drawImage` per changed frame |
| Failure modes | Lost contexts, driver bugs, shader compile failures | A frame is either there or a neighbour is used |
| Quality ceiling | Whatever runs at 60 fps on the worst device | Whatever the renderer can do with unlimited time |
| Load behaviour | All-or-nothing per model | Coarse pass first, refined while you look at it |

The third row is the one that actually decided it. A real-time build has failure
modes a visitor can hit and a developer cannot reproduce. A sequence has none.

## Running it

```bash
npm install
npm run dev            # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint (flat config) |
| `npm run test:e2e` | Playwright, against a production build |
| `npm run sequences` | Re-render every product sequence |

## The render pipeline

Three stages, all offline. None of it ships to the browser.

```
modeles-3D/*.glb            raw Sketchfab exports, 55.7 MB, gitignored
   │  node scripts/compress-models.mjs
   ▼
public/models/*.glb         meshopt + WebP textures, 15.8 MB, build-time only
   │  node scripts/render-sequences.mjs   (drives /render in a real browser)
   ▼
public/sequences/<id>/      180 transparent WebP frames + manifest.json
```

`/render` is a route that loads one product, exposes `window.__seek(frame)`, and
renders exactly one frame per call. The driver screenshots the canvas, computes
**one** crop box from the union of every frame's alpha extent, then crops and
encodes the whole sequence to that box. A shared box matters: trimming each
frame to its own content makes the product breathe in and out as it rotates,
because the silhouette's extent changes frame to frame.

Frames are transparent and tightly cropped, which is what keeps them small and
lets the background be plain CSS — so a section can change colour instantly with
nothing to re-render.

**Why 180 and not 90.** Ninety frames over a full revolution is four degrees a
frame. On an object filling two thirds of the viewport that step is visible as
judder when you scrub slowly: the scroll is smooth and the product is not.
Doubling the count halves the step, and there is nothing to interpolate between
two photographs of a rotating object, so more frames is the only lever. The
AirPods Max ships at a smaller delivered size than the rest — its knitted canopy
is high-frequency detail that costs twice as much to encode and is invisible at
display size.

### Two things the pipeline gets wrong if you are not careful

**The app's own stylesheet paints the frames.** Playwright's `omitBackground`
clears the browser's *default* background, not an explicit one — `body` had a
background from `globals.css`, so it was ending up baked behind every frame and
the sequences shipped with no alpha at all. `/render` clears it for its own
route.

**A flat environment produces flat products.** Every reflective surface mirrors
the surround; if that surround is one uniform colour, the back of an aluminium
phone comes back as a single unshaded block no matter how good the softboxes
are. The studio's surround is a vertical gradient for exactly this reason.

## Architecture

```
app/
  page.tsx            the showcase
  render/             the offline frame renderer (never linked)
components/
  sequence/           the canvas player
  sections/           hero, product sections, footer
  ui/                 loader, nav, progress rail, magnetic controls
lib/
  sequence.ts         progressive loading, nearest-frame lookup, memory release
  catalogue.ts        the five products: name, anchor, room colours
  render-config.ts    offline choreography — what each product does, per frame
  clamshell.ts        finds and drives a laptop lid, by measurement not by name
  materials.ts        photographic material tuning for the render side
  theme.ts            cross-fades the page's ground colour between products
```

### Scroll never touches React state

ScrollTrigger writes the scrub position into a ref; the canvas player reads it
inside its own animation loop and redraws only when the chosen frame actually
changes. At 120 Hz, routing that through `useState` would re-render the tree a
hundred times a second to draw one image.

Sections are held with CSS `position: sticky` rather than GSAP's pin — no
pin-spacer, and no refresh needed on resize.

### Memory is managed explicitly

A decoded 1000×1000 frame is 4 MB. A hundred and eighty of them is 720 MB, and five products
resident at once would exhaust a phone. Frames are held as `ImageBitmap`, which
can be released deterministically with `close()`, and `retainOnly()` keeps at
most the current section and its two neighbours decoded.

### Loading is progressive, not all-or-nothing

Frames arrive in strides — every eighth, then every fourth, then the rest — and
the player draws the nearest frame it already has. Scrubbing is usable after
about twenty frames instead of after a hundred and eighty, and the loading screen releases at
the first coarse pass.

### Finding a laptop's lid without knowing its name

These are Sketchfab exports with hashed node names, so the hinge is found by
measurement: base parts sit within a millimetre of the desk, lid parts reach the
full height of the machine. The angle that shuts it is derived from the lid's own
bounding box rather than hard-coded, and the rotation is applied as a matrix
rather than by re-parenting — `Object3D.attach` bakes its result into
position/rotation/scale, and these node chains carry non-uniform scale under
rotation, which no TRS triple can express. Re-parenting silently skewed the
model into a giant black slab; the matrix form does not.

## Design

Grounded in reference images the project owner supplied, read visually rather
than sampled — the references were pasted into a conversation, not saved to
disk, so the palette was not extracted with a script. Saying so because the
difference matters.

What the references actually do, and what this build takes from them:

- **The oversized product name is *lighter* than the wall it sits on.** That
  inversion is the whole effect. A darker word reads as text you are meant to
  read; a lighter one reads as light falling on a surface.
- **Names are stacked, not set on one line**, and bleed off the left edge.
- **Two ink tones, no more.** Both clear 4.5:1 on every ground the site uses,
  including the deep taupe of the AirPods Pro section. Labels are quieted with
  size and tracking rather than by washing out their colour, which is the usual
  way small type falls below the contrast floor.
- **Inter Tight for display, Inter for body.** The narrower apertures are what
  let a stacked name hold together as one block at 200px.
- **Each product owns a room.** The ground colour cross-fades as a section takes
  over, so the whole page changes key at once instead of showing a seam.
- **Products alternate sides down the page.** Five sections with the product in
  the same place reads as a template, and the eye stops travelling after the
  second one.
- **One word per section is set as an outline.** It gives the page a second
  typographic voice without introducing a second typeface.

### Sections are three beats, not one

A product that rotates while a single paragraph sits beside it is turning for no
reason. Each section runs its scroll range as three blocks that replace one
another in place — an overview, an anatomy pass with annotated callouts drawn
onto the product and one statistic at display scale, then the full
specification. The windows deliberately do not overlap: an earlier version
cross-faded them, and two dense blocks at half opacity read as one broken block
rather than as a transition.

## Accessibility and internationalisation

- Full English and French, switchable at runtime. Every layout is sized against
  the **French** string, which runs 15–20% longer. A Playwright test fails if any
  text clips or the page scrolls sideways in either language.
- Text reveal masks carry optical padding so they cannot clip the accents on
  French capitals (É, À, Ç) or descenders.
- The oversized display word is `aria-hidden`; the same words are the section's
  real heading.
- `prefers-reduced-motion` disables smooth scroll, the hero timeline and the
  reveals, and freezes the room colour instead of tweening it.
- Skip link, labelled controls, visible focus rings.

## Licence

Code is MIT. The 3D models are third-party assets under their own licences and
are not covered by it.
