# Shared Relational Field

A real-time multi-user web prototype for an art/design critique context. One shared display renders a living field of connected nodes and flowing particles while multiple phones inject force into that field through touch.

## Install

```bash
npm install
```

## Run locally

```bash
npm start
```

The server starts on `http://localhost:3000` by default.

## Open the app

- Main artwork screen: `http://localhost:3000/display`
- Mobile controller: `http://localhost:3000/controller`

Open `/display` on a laptop or projector machine. Visitors can scan the QR code shown there to join `/controller` from their phones.

## Adjustable parameters

You can tune the field in [`public/display.js`](/c:/Users/gando/Documents/Code/Grid/public/display.js):

- `CONFIG.NODE_DENSITY` for node count
- `CONFIG.INTERACTION_STRENGTH` for disturbance strength
- `CONFIG.DECAY_SPEED` for decay speed
- `CONFIG.MEMORY_STRENGTH` for short-term memory
- `CONFIG.LINE_OPACITY` for line opacity
- `CONFIG.GLOW_AMOUNT` for glow amount
- `CONFIG.BACKGROUND_COLOR` for background color
- `CONFIG.TURBULENCE` and `CONFIG.RESONANCE` for turbulence/resonance amount
