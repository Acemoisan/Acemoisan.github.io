# Portfolio Game Layer System — Design Spec

## Overview

Transform Aidan Moisan's static portfolio site into an interactive, game-flavored experience using a modular "Game Layer System." The system adds a thin event-driven engine on top of the existing static HTML/CSS/JS site — no framework migration, no build step, still vanilla JS on GitHub Pages.

### Goals

- Make the portfolio feel playful, technically impressive, and game-developer branded
- Ship incrementally — each module works standalone, evolve over time
- Subtle game nods (not a joke site) — still reads as a professional portfolio

### Constraints

- No build tools or framework dependencies
- Must work on GitHub Pages (static hosting)
- Performance-conscious — no jank on mid-range devices
- Progressive enhancement — site fully works without JS modules (graceful degradation)

---

## Architecture

### Portfolio Engine (`assets/js/portfolio-engine.js`)

A lightweight event bus and module loader. Responsibilities:

- **Event bus:** Simple pub/sub (`engine.on(event, callback)`, `engine.emit(event, data)`)
- **Module registration:** Modules call `engine.register(name, initFn)` — engine calls `initFn` on DOMContentLoaded
- **Shared state:** Minimal state object (current section, hover target) that modules can read

### Module Structure

Each module is a self-contained JS file in `assets/js/modules/`. Modules:

- Register with the engine via `engine.register()`
- Listen for engine events to coordinate with other modules
- Emit events when something noteworthy happens
- Handle their own cleanup and performance management

### File Layout

```
assets/js/
├── main.js                  // existing — untouched
├── portfolio-engine.js      // event bus + module loader
└── modules/
    ├── cursor.js            // themed cursor system
    ├── particles.js         // canvas particle effects
    ├── game-ui.js           // XP bars, quest titles, toasts
    └── arcade.js            // embedded game management
```

### Event Flow Example

1. User hovers a project card
2. Engine emits `hover:project` with element reference
3. CursorModule → switches to crosshair style
4. ParticleModule → spawns subtle sparkle burst
5. (Future modules can hook into the same event)

---

## Module 1: Cursor (`modules/cursor.js`)

### Cursor States

| Context | Cursor Style | Behavior |
|---------|-------------|----------|
| Default | Glowing dot | Custom canvas-drawn dot replacing system cursor, with faint trailing glow |
| Links & Nav | Grow + ring | Dot expands with a ring effect — like targeting a menu item |
| Project Cards | Crosshair + pulse | Crosshair-style cursor with subtle pulse animation |
| Arcade Section | Hidden | Cursor hides when entering the game iframe for seamless gameplay transition |

### Implementation Details

- CSS `cursor: none` on `body`, replaced by a small canvas-drawn element following mouse position
- Uses `requestAnimationFrame` for smooth 60fps rendering
- Pauses rendering when tab is not visible (`document.hidden`)
- Trail is 3-5 fading dots behind the main cursor position
- Hover state changes detected via engine events, not per-element listeners (engine handles delegation)

---

## Module 2: Particles (`modules/particles.js`)

### Effect Types

| Effect | Location | Trigger | Description |
|--------|----------|---------|-------------|
| Ambient | Hero section | Always active | Slow-drifting pixel-style squares floating upward. Low density (~15-20 particles). Matches pixel-art GIF aesthetic. |
| Burst | Anywhere | Click on nav/project | 10-15 particles explode outward from click point, fade quickly. Like a hit effect. |
| Mouse Trail | Hero section only | Mouse movement | Faint sparkle trail behind cursor. Fades within 0.5s. Hero section only to avoid being obnoxious. |
| Section Transition | Section edges | Scroll into view | Brief shimmer/pixel-dissolve at edges as sections enter viewport. Like a scene loading. |

### Implementation Details

- Single persistent `<canvas>` element behind page content (`z-index: -1`, `position: fixed`)
- Particles are simple colored squares (2-4px) — pixel-art style, no complex shapes
- Uses `IntersectionObserver` to only render particles for visible sections
- Auto-pauses entirely when no section with particles is visible
- Particle pool pattern — pre-allocate and reuse particle objects to avoid GC pressure
- Hero ambient particles: ~15-20 active at once, gentle upward drift with slight horizontal sway
- Burst particles: short lifespan (0.3-0.5s), gravity-affected, color matches site accent (#149ddd)

---

## Module 3: Game UI (`modules/game-ui.js`)

### XP Skill Bars

Restyle the existing (currently hidden) skills section as game-style XP bars:

- Each skill shows: skill name, flavor text comment (e.g., `// PRIMARY WEAPON`), level number, XP fraction
- Bar animates on scroll (Waypoints already in vendor libs) — fills up like leveling a character
- Gradient fill: `linear-gradient(90deg, #10b981, #34d399)`
- Level numbers derived from skill percentage (e.g., 80% → LVL 8)

### Quest-Style Section Headers

Restyle section headers with subtle game flavor:

- Small uppercase label above: `— QUEST LOG —`, `— INVENTORY —`, `— ARCADE —`
- Main title stays as-is (e.g., "Professional Experience")
- Optional subtitle: `▸ 3 quests completed`
- CSS-only changes — no structural HTML modifications needed beyond adding data attributes

### Achievement Toasts

Slide-in notifications triggered by user milestones:

| Achievement | Trigger | Icon |
|-------------|---------|------|
| "Explorer" | Scrolled past 50% of the page | 🗺️ |
| "Deep Diver" | Scrolled to the bottom | 🏆 |
| "Gamer" | Played the arcade for 30+ seconds | 🎮 |
| "Curious" | Clicked 3+ project cards | 🔍 |

- Slides in from bottom-right corner
- Auto-dismisses after 4 seconds
- Styled: dark background, green accent border, icon + title + description
- Tracks shown achievements in `sessionStorage` — no repeats per visit
- Max 1 toast visible at a time — queue if multiple trigger simultaneously

---

## Module 4: Arcade (`modules/arcade.js`)

### Embedded Game Section

A new section in `index.html` placed after the Portfolio section and before the About section:

- Quest-style header: `— ARCADE —` / "Play PDKM"
- Subtitle: "Try one of my games right here — no download needed"
- 16:9 container with a styled Play button overlay
- **Lazy-loaded:** iframe only created when user clicks Play (saves bandwidth)
- Source: itch.io embed URL derived from `https://acemoisan.itch.io/pdkm` (resolve actual embed-upload ID during implementation)
- Fullscreen toggle button in corner
- ESC to exit fullscreen

### Behavior

- On Play click: inject iframe, hide Play button overlay, emit `arcade:start` event
- CursorModule listens for `arcade:start` → hides custom cursor inside game area
- After 30 seconds of play, emit `arcade:milestone` → GameUIModule shows "Gamer" achievement
- On section scroll-away or ESC: emit `arcade:stop`, optionally pause/unload iframe to save resources

---

## Performance Budget

- Total additional JS: target < 15KB minified (no build step, but files should be written lean)
- Canvas particle rendering: must maintain 60fps with ~50 active particles
- Lazy-load the arcade iframe — zero cost until user clicks Play
- `requestAnimationFrame` for all animations — no `setInterval`
- `IntersectionObserver` to pause off-screen effects
- `document.hidden` check to pause all rendering when tab is backgrounded

## Browser Support

- Modern evergreen browsers (Chrome, Firefox, Safari, Edge — last 2 versions)
- Graceful degradation: if canvas or IntersectionObserver unavailable, modules simply don't initialize
- Mobile: cursor module disables on touch devices (no hover), particles render at half density

## Future Modules (Not In Scope — Listed for Architecture Validation)

These validate that the module system is extensible:

- **SoundModule** — subtle UI sounds, ambient background, mute toggle
- **Easter Eggs Module** — konami code, click sequences, hidden sections
- **Canvas Takeover** — evolve particle canvas into full interactive background (path toward bruno-simon)
- **Additional Arcade Games** — carousel of embedded games, not just PDKM
