# Pitch video storyboard

A short motion-graphics script for explaining the BarterChain primitive. Target
length 60–75 seconds. Designed for a single voice-over and minimal narration so
it can carry a tagline overlay or be re-cut into shorter loops for social.

The same beats are implemented in the browser as
`components/pitch/cycle-visualization.tsx` — a real producer can match the
timing of that animation directly.

## Tone

Calm, technical, confident. Not VC-pumpy. The pitch is "here is a working
primitive, here is where it fits, take it if it helps." Closer to a
documentary explainer than a startup hype reel.

## Color and typography

- Background: cream (#f8f5ee → #f1eadc gradient)
- Primary ink: near-black (#0f172a)
- Accent: amber (#f59e0b → amber-700)
- Type: a solid neutral sans (Inter, IBM Plex Sans, or the project's Geist)
- Diagrams should match the in-app cycle visualization for visual continuity

## Beat sheet

### 0:00 – 0:05 · Cold open

**Visual.** Blank cream canvas. A small black dot enters from the left. Two
more dots fade in. Each dot is labelled with a name (Anya, Bram, Celine).

**VO.**
> Three people. Three things they don't use. Three different things they want.

### 0:05 – 0:15 · The pair-wise failure

**Visual.** A dashed line attempts to connect Anya to Bram. The line breaks
into a red `×` over a small label that reads `wants ≠ has`.

**VO.**
> Direct trade only works when two people happen to want exactly each other's
> stuff. Most of the time they don't. Pair-wise barter dead-ends.

**Lower third overlay.** "Pair-wise dead-ends ≈ 90% of pairs in observed data."

### 0:15 – 0:30 · The cycle

**Visual.** The three nodes arrange into a triangle. Solid amber arrows draw
in sequence — Anya → Celine, Celine → Bram, Bram → Anya — each accompanied by
a small label naming the item flowing on that arrow.

The arrows then start a continuous loop animation: items (camera, espresso,
bike) glide along the edges, each ending at the recipient who wanted it.

**VO.**
> Pass the items around the loop instead of swapping them in pairs. Each
> person hands off what they have, receives what they want. A cycle closes.

**On screen, after the loop.** Caption fades in: "3-cycle ≈ 2× more matches
than pair-wise (kidney-exchange data)."

### 0:30 – 0:42 · The buffer

**Visual.** The three nodes shrink and shift to the left edge. A larger
rounded rectangle labelled `Buffer` (with a subtle € symbol) appears in the
centre. Each item flies from its node into the buffer and stacks visibly
inside.

A small clock or counter on the buffer ticks up, with text "€ daily storage"
fading in next to it.

**VO.**
> If items deposit into a buffer first, atomicity stops being a coordination
> problem. Storage fees accrue daily — which itself nudges people toward
> faster, more flexible matches.

### 0:42 – 0:55 · Inventory-first matching closes the cycle

**Visual.** A small "engine" pill appears under the buffer. A wave of light
ripples through the buffer (matcher running). When the wave finishes, three
items shoot out of the buffer toward their respective new owners — Anya
receives the bike, Bram receives the espresso, Celine receives the camera.

**VO.**
> The matching engine works on inventory in place. When it finds a closing
> cycle, every item ships at once. Nobody waits on anyone.

**Caption.** "Drop-out risk → 0. Multi-hop becomes operationally feasible."

### 0:55 – 1:10 · Where the primitive fits

**Visual.** Five icons fade in across the screen, each with a one-word label:
`kidney`, `real estate`, `housing swap`, `collectibles`, `shifts`.

**VO.**
> The same matching primitive shows up in kidney exchange, real estate chains,
> vacation swap, collector trading, and shift swapping. Different domains —
> same algorithmic shape.

### 1:10 – 1:15 · The ask

**Visual.** The screen reduces to a clean card with three lines:
- Open-source · MIT
- github.com/omerbakalovic/barterchain-mvp
- "If this primitive fits a problem you're solving, take it."

**VO.**
> The code is open. If this primitive fits something you're building, fork it
> and run.

## Production notes

- All on-screen elements should be vector-friendly. The infographic SVG at
  `public/cycle-infographic.svg` provides the design language for the
  triangle, arrows, and buffer.
- Keep VO under 110 words total (≈ 60 seconds at a calm cadence).
- Subtitles burned in are recommended — most viewing happens muted.
- The browser animation in `components/pitch/cycle-visualization.tsx` mirrors
  the same five phases (`intro`, `pair-fail`, `cycle`, `buffer`, `ship`) so
  any video produced from this storyboard can be cross-linked from the live
  page.
- Recommended music: ambient electronic at low volume, or no music at all.
  The pitch is technical; silence is fine.

## Variants for shorter cuts

- **15-second loop.** Phases 2–4 only (pair-fail → cycle → ship). No VO. For
  social embed.
- **30-second cut.** Drop the verticals beat and end at 0:55. Pair with a
  single overlay tagline.
- **2-minute extended.** Add a 30-second beat after 0:55 walking through the
  five verticals one by one with concrete one-line examples.
