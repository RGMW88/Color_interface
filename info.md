# Shared Relational Field

## Project Summary

This project is a real-time, multi-user web installation prototype. It creates a shared visual field that can be displayed on a large screen, projector, or monitor, while multiple participants interact with it from their phones.

The work is not a game, drawing tool, or productivity interface. It is a conceptual interaction system for an art, design, or research context.

The central idea is:

> A fixed shared structure whose internal conditions are continuously reorganized by local interventions.

Participants do not draw images or place objects. Instead, each touch affects one point in a fixed grid. That point changes state, color, intensity, direction, and memory. These changes then influence neighboring points over time.

The result is a living relational matrix: stable in structure, but unstable in condition.

## Concept

The project explores relation, propagation, and collective influence.

The field is built from a fixed architectural grid. The grid does not move, bend, wobble, or deform. Its points remain anchored like cells in a wall, LED matrix, responsive panel, or architectural surface.

What changes is the internal state of each point:

- color
- intensity
- direction
- glow
- memory
- local flow tendency
- neighbor influence

Each participant can touch the controller interface from a phone. Their touch affects the closest grid point on the shared display. This makes the interaction precise and spatially legible.

The touched point does not become a private mark. Instead, it becomes a temporary condition inside a shared system. Over time, that condition spreads, blends, rotates, fades, and mixes with future touches.

The conceptual message is that local action does not remain isolated. It enters a network of relations.

## Core Experience

There are two primary pages:

### `/display`

The display page is the main artwork screen.

It is intended for:

- a laptop
- projector
- large monitor
- gallery display
- shared critique environment

It renders the fixed responsive grid using the Canvas API.

The display includes:

- a full-screen field
- a QR code linking to the controller
- a reset button

The display does not require direct interaction. It is the shared visual output.

### `/controller`

The controller page is optimized for phones.

It includes:

- a color selector
- a subtle grid guide
- a full-screen touch surface

Participants choose one of five colors. When they tap, hold, or drag, the controller sends normalized touch coordinates and the selected color to the server.

The controller does not render the full artwork. It acts as an entry point into the shared field.

## Interaction Model

Each touch affects the closest grid point on the display.

### Tap

A tap activates one grid point.

It injects:

- color
- brightness
- local directional spin
- memory

### Hold

Holding sustains pressure on the nearest grid point.

It reinforces:

- intensity
- glow
- rotational memory
- color persistence

### Drag

Dragging moves across the controller surface and activates a sequence of nearest grid points.

This creates a path through the fixed matrix, but it is not a drawn line. The result is a chain of changing states inside the field.

### Multiple Users

Multiple users can interact at the same time.

Their colors and forces overlap in the same shared grid. The system does not assign ownership. User colors can mix, interfere, and merge with residual color left by earlier interactions.

The work emphasizes shared condition rather than individual authorship.

## Visual System

The visual system is a fixed grid of luminous directional cells.

Each cell has:

- a fixed `x` and `y` position
- a flow direction
- an intensity value
- a memory value
- a color tint
- a color weight
- neighbor influence

The grid remains spatially stable at all times.

Motion is created through changing internal direction and light, not through moving geometry.

The display should feel like:

- a responsive wall
- an illuminated matrix
- a field of relational states
- a physical installation prototype
- a collective signal surface

It should not feel like:

- a drawing canvas
- a game
- a particle toy
- a jelly mesh
- a fabric simulation
- a private marking system

## Color Behavior

Participants select one of five colors on the controller.

When a participant touches the surface:

1. the closest grid point receives that color
2. the point becomes brighter
3. the point gains memory
4. the point influences neighboring points
5. color persists and mixes with future color choices

The color system is intended to show cumulative shared presence.

Colors should remain visible long enough for participants to see overlapping histories. They should not disappear immediately. They should also not become permanent. The field is temporary, but not instant.

The goal is a balance between:

- persistence
- decay
- mixing
- collective accumulation
- impermanence

## Technical Architecture

The project uses:

- Node.js
- Express
- Socket.IO
- HTML
- CSS
- JavaScript
- Canvas API

There is no database, login, account system, chat, score, timer, or persistence layer.

The architecture is intentionally simple:

1. The Node server serves static files from `public/`.
2. `/display` renders the shared field.
3. `/controller` sends touch events.
4. Socket.IO broadcasts controller touch events to connected displays.
5. The display applies the simulation locally and renders the result.

The display page is the authoritative visual output.

Controllers do not store or simulate the artwork. They only send interaction data.

## File Structure

```text
package.json
server.js
README.md
info.md
public/
  display.html
  controller.html
  style.css
  display.js
  controller.js
```

## Main Files

### `server.js`

Creates the Express server and Socket.IO instance.

Responsibilities:

- serve static files
- route `/display`
- route `/controller`
- generate QR code data
- receive controller touch events
- sanitize color values
- broadcast touch events to displays
- broadcast reset events

### `public/display.js`

Contains the main visual system and simulation.

Responsibilities:

- create the fixed grid
- render the display canvas
- receive real-time touch events
- find the nearest grid cell
- apply color, force, memory, and direction
- update neighbor influence
- mix color over time
- render strokes, halos, points, and connections
- handle reset and resize

Important adjustable parameters include:

- grid density
- line length
- line thickness
- interaction strength
- intensity decay
- memory strength
- neighbor influence
- color diffusion
- color persistence
- glow persistence
- saturation floor
- background color

### `public/controller.js`

Contains the mobile controller behavior.

Responsibilities:

- render color choices
- track active selected color
- capture pointer/touch input
- normalize touch coordinates
- send start, move, hold, and end events
- send selected color with each event
- show subtle touch feedback

### `public/style.css`

Defines visual styling for both display and controller pages.

Responsibilities:

- dark atmospheric presentation
- display UI styling
- QR panel styling
- mobile controller styling
- color chip styling
- controller grid guide
- touch indicator

## System Behavior

The system is continuously alive.

Even without input, each cell has subtle baseline directional motion. This prevents the display from feeling static.

When input occurs, the field changes more strongly:

- the touched cell brightens
- its direction changes
- color is introduced
- color and intensity propagate to neighboring cells
- memory keeps effects visible after touch ends
- later touches mix with previous color residue

The field gradually relaxes but does not immediately erase itself.

## Implications

This project can be read as a visual model of shared conditions.

It suggests that:

- local actions have distributed consequences
- no intervention is fully isolated
- shared systems retain traces of participation
- identity can enter a system without becoming ownership
- collective presence can be visible without usernames or avatars
- memory can be temporary but still meaningful
- structure can remain stable while relations inside it change

In a physical installation, the grid could translate into:

- LEDs
- illuminated tiles
- responsive wall panels
- embedded light nodes
- architectural sensors
- a public interaction surface

The prototype is therefore both a web app and a sketch for a possible spatial system.

## Prompt For Another AI

You are working on a real-time multi-user conceptual web installation called **Shared Relational Field**.

It is built with Node.js, Express, Socket.IO, HTML, CSS, JavaScript, and Canvas. It has two pages: `/display` and `/controller`.

The `/display` page is the main projected artwork. It renders a fixed architectural grid of cells. The grid points never move spatially. All motion comes from internal state changes: direction, intensity, memory, color, glow, and neighbor influence.

The `/controller` page is a phone interface. Users choose one of five colors and touch a grid-guided surface. Their touch is normalized and sent to the server over Socket.IO. The server broadcasts it to the display.

Each touch affects exactly one grid point: the closest display cell to the normalized controller coordinate. A touch does not draw a mark. It injects state into that cell. The cell receives color, brightness, direction, and memory. Neighboring cells gradually inherit and mix these properties.

Multiple users can connect at the same time. Their colors and pressures overlap in the same field. Colors should persist long enough to mix with future touches. The system should feel collective, not owned by individual users.

The visual direction should remain restrained, dark, architectural, and exhibition-friendly. Avoid game language, playful mechanics, avatars, usernames, scores, chat, stickers, or drawing tools.

When modifying the project, preserve:

- the fixed grid
- the `/display` and `/controller` routes
- Socket.IO real-time communication
- the QR code flow
- exact nearest-cell touch targeting
- color persistence and mixing
- minimal interface

The project should communicate changing relations within a stable shared structure.
