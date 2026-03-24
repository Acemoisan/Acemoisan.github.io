# Portfolio Game Layer System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a modular "Game Layer System" to Aidan's static portfolio site — custom cursor, particle effects, game-themed UI, and an embedded itch.io game — all coordinated through a lightweight event bus.

**Architecture:** A central `portfolio-engine.js` provides a pub/sub event bus and module loader. Four self-contained modules (`cursor.js`, `particles.js`, `game-ui.js`, `arcade.js`) register with the engine, listen for shared events, and manage their own rendering/cleanup. No build tools — vanilla ES6 modules loaded via `<script>` tags.

**Tech Stack:** Vanilla JavaScript (ES6+), HTML5 Canvas, CSS3, existing Bootstrap 5 site on GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-03-24-portfolio-game-layer-design.md`

---

## File Structure

```
assets/js/
├── main.js                  // existing — NOT modified
├── portfolio-engine.js      // NEW — event bus + module loader + hover delegation
└── modules/
    ├── cursor.js            // NEW — custom cursor with states
    ├── particles.js         // NEW — canvas particle system
    ├── game-ui.js           // NEW — XP bars, quest headers, achievement toasts
    └── arcade.js            // NEW — embedded game management

assets/css/
├── style.css                // MODIFY — add game-ui styles (XP bars, quest headers, toasts, arcade section)

index.html                   // MODIFY — add script tags, arcade section HTML, uncomment/restyle skills section, add data attributes
```

---

### Task 1: Portfolio Engine — Event Bus & Module Loader

**Files:**
- Create: `assets/js/portfolio-engine.js`

This is the foundation everything else depends on. A simple pub/sub event bus with module registration, shared state, and delegated hover/click detection.

- [ ] **Step 1: Create the engine file**

Create `assets/js/portfolio-engine.js` with this implementation:

```javascript
/**
 * Portfolio Engine — lightweight event bus and module loader.
 * Coordinates interactive modules across the site.
 */
const PortfolioEngine = (() => {
  const listeners = {};
  const modules = {};

  const state = {
    currentSection: null,
    hoverTarget: null,
    isMobile: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  };

  const engine = {
    state,

    on(event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    },

    off(event, callback) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    },

    emit(event, data) {
      if (!listeners[event]) return;
      listeners[event].forEach(cb => cb(data));
    },

    register(name, initFn) {
      modules[name] = { initFn, initialized: false };
    },

    init() {
      // Initialize all registered modules
      Object.entries(modules).forEach(([name, mod]) => {
        try {
          mod.initFn(engine);
          mod.initialized = true;
        } catch (e) {
          console.warn(`[PortfolioEngine] Module "${name}" failed to init:`, e);
        }
      });

      // Delegated hover detection
      document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-engine-hover]');
        if (target) {
          const hoverType = target.getAttribute('data-engine-hover');
          state.hoverTarget = { type: hoverType, el: target };
          engine.emit('hover:' + hoverType, { el: target });
        }
      });

      document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-engine-hover]');
        if (target) {
          state.hoverTarget = null;
          engine.emit('hover:leave', { el: target });
        }
      });

      // Delegated click detection
      document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-engine-click]');
        if (target) {
          const clickType = target.getAttribute('data-engine-click');
          engine.emit('click:' + clickType, { el: target, event: e });
        }
      });

      // Section tracking via IntersectionObserver
      const sections = document.querySelectorAll('section[id]');
      if (sections.length && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              state.currentSection = entry.target.id;
              engine.emit('section:enter', { id: entry.target.id, el: entry.target });
            }
          });
        }, { threshold: 0.3 });

        sections.forEach(section => observer.observe(section));
      }

      // Visibility change — let modules pause when tab is hidden
      document.addEventListener('visibilitychange', () => {
        engine.emit(document.hidden ? 'visibility:hidden' : 'visibility:visible');
      });
    }
  };

  return engine;
})();
```

- [ ] **Step 2: Wire engine into index.html**

Add the script tag in `index.html` after the existing `main.js` script (line 988). Add it as the first new script, before any modules:

```html
  <!-- Portfolio Engine -->
  <script src="assets/js/portfolio-engine.js"></script>
```

- [ ] **Step 3: Add data attributes to interactive elements**

In `index.html`, add `data-engine-hover` attributes to elements that modules will react to:

- All nav links (`#navbar a`): add `data-engine-hover="nav"`
- All `.portfolio-wrap` divs inside each `.portfolio-item`: add `data-engine-hover="project"` and `data-engine-click="project"`. These are the clickable wrapper elements containing the portfolio images and overlay icons.
- Social links (`.social-links a`): add `data-engine-hover="link"`

- [ ] **Step 4: Add engine initialization call**

Add a small inline script at the very end of `index.html`, just before `</body>`:

```html
  <!-- Initialize Portfolio Engine after all modules loaded -->
  <script>PortfolioEngine.init();</script>
```

Note: Since this script tag is at the end of `<body>`, the DOM is already parsed — no need for a `DOMContentLoaded` wrapper.

- [ ] **Step 5: Verify in browser**

Open `index.html` in a browser. Open DevTools console. Verify:
- No errors in console
- Type `PortfolioEngine.state` — should show `{ currentSection, hoverTarget, isMobile }`
- Type `PortfolioEngine.emit('test', {foo:1})` — should not error

- [ ] **Step 6: Commit**

```bash
git add assets/js/portfolio-engine.js index.html
git commit -m "feat: add portfolio engine event bus and module loader"
```

---

### Task 2: Cursor Module — Custom Themed Cursor

**Files:**
- Create: `assets/js/modules/cursor.js`
- Modify: `index.html` — add script tag

The custom cursor replaces the system cursor with a glowing dot that changes state based on what the user hovers. Disables on touch devices.

- [ ] **Step 1: Create the cursor module**

Create `assets/js/modules/cursor.js`:

```javascript
/**
 * Cursor Module — custom themed cursor with state changes.
 * Disables on touch devices.
 */
PortfolioEngine.register('cursor', (engine) => {
  if (engine.state.isMobile) return;

  const cursor = document.createElement('div');
  cursor.className = 'pe-cursor';
  cursor.innerHTML = '<div class="pe-cursor-dot"></div><div class="pe-cursor-ring"></div>';
  document.body.appendChild(cursor);

  const dot = cursor.querySelector('.pe-cursor-dot');
  const ring = cursor.querySelector('.pe-cursor-ring');

  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;
  let ringScale = 1;
  let targetRingScale = 1;
  let visible = true;
  let animating = true;
  let cursorState = 'default'; // default, nav, project, link, hidden

  // Hide system cursor
  document.body.style.cursor = 'none';
  document.querySelectorAll('a, button, [data-engine-hover]').forEach(el => {
    el.style.cursor = 'none';
  });

  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!visible) {
      visible = true;
      cursor.style.opacity = '1';
    }
  });

  // Hide when mouse leaves window
  document.addEventListener('mouseleave', () => {
    visible = false;
    cursor.style.opacity = '0';
  });

  // State changes
  const setState = (state) => {
    cursorState = state;
    cursor.className = 'pe-cursor pe-cursor--' + state;
    switch (state) {
      case 'nav':
      case 'link':
        targetRingScale = 1.8;
        break;
      case 'project':
        targetRingScale = 2.2;
        break;
      case 'hidden':
        cursor.style.opacity = '0';
        break;
      default:
        targetRingScale = 1;
    }
  };

  engine.on('hover:nav', () => setState('nav'));
  engine.on('hover:link', () => setState('link'));
  engine.on('hover:project', () => setState('project'));
  engine.on('hover:leave', () => setState('default'));
  engine.on('arcade:start', () => setState('hidden'));
  engine.on('arcade:stop', () => setState('default'));

  // Animation loop
  const render = () => {
    if (!animating) return;

    // Smooth follow with lerp
    cursorX += (mouseX - cursorX) * 0.15;
    cursorY += (mouseY - cursorY) * 0.15;
    ringScale += (targetRingScale - ringScale) * 0.12;

    cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
    ring.style.transform = `scale(${ringScale})`;

    requestAnimationFrame(render);
  };

  // Pause when tab hidden
  engine.on('visibility:hidden', () => { animating = false; });
  engine.on('visibility:visible', () => { animating = true; render(); });

  render();
});
```

- [ ] **Step 2: Add cursor CSS to style.css**

Append to `assets/css/style.css`:

```css
/* ======= Portfolio Engine: Cursor Module ======= */
.pe-cursor {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 99999;
  mix-blend-mode: difference;
  transition: opacity 0.2s;
}

.pe-cursor-dot {
  position: absolute;
  top: -4px;
  left: -4px;
  width: 8px;
  height: 8px;
  background: #149ddd;
  border-radius: 50%;
}

.pe-cursor-ring {
  position: absolute;
  top: -18px;
  left: -18px;
  width: 36px;
  height: 36px;
  border: 1.5px solid rgba(20, 157, 221, 0.5);
  border-radius: 50%;
  transition: transform 0.2s ease-out;
}

.pe-cursor--project .pe-cursor-dot {
  background: #10b981;
}

.pe-cursor--project .pe-cursor-ring {
  border-color: rgba(16, 185, 129, 0.5);
  border-width: 2px;
}

.pe-cursor--nav .pe-cursor-ring,
.pe-cursor--link .pe-cursor-ring {
  border-color: rgba(20, 157, 221, 0.7);
}

.pe-cursor--hidden {
  opacity: 0 !important;
}
```

- [ ] **Step 3: Add script tag to index.html**

Add after the `portfolio-engine.js` script tag:

```html
  <script src="assets/js/modules/cursor.js"></script>
```

- [ ] **Step 4: Verify in browser**

Open `index.html`. Verify:
- System cursor is hidden, custom blue dot + ring visible
- Dot follows mouse smoothly with slight lag
- Hovering nav links: ring expands
- Hovering project cards: ring expands, dot turns green
- Moving mouse off window: cursor fades out

- [ ] **Step 5: Commit**

```bash
git add assets/js/modules/cursor.js assets/css/style.css index.html
git commit -m "feat: add custom cursor module with hover states"
```

---

### Task 3: Particle Module — Canvas Particle Effects

**Files:**
- Create: `assets/js/modules/particles.js`
- Modify: `index.html` — add script tag

Canvas-based particle system with ambient hero particles, click bursts, and mouse trail.

- [ ] **Step 1: Create the particles module**

Create `assets/js/modules/particles.js`:

```javascript
/**
 * Particles Module — canvas-based pixel-art particle effects.
 * Ambient hero particles, click bursts, mouse trail.
 */
PortfolioEngine.register('particles', (engine) => {
  const canvas = document.createElement('canvas');
  canvas.className = 'pe-particles-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let w, h;
  let animating = true;
  const isMobile = engine.state.isMobile;
  const maxAmbient = isMobile ? 8 : 18;
  let mouseX = 0, mouseY = 0;
  let inHero = true;

  const resize = () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  // Particle pool
  const particles = [];
  const POOL_SIZE = 120;

  const createParticle = () => ({
    x: 0, y: 0, vx: 0, vy: 0,
    size: 2, alpha: 1, life: 0, maxLife: 1,
    color: '#149ddd', type: 'ambient', active: false,
    gravity: 0,
  });

  for (let i = 0; i < POOL_SIZE; i++) particles.push(createParticle());

  const getParticle = () => particles.find(p => !p.active);

  // Spawn ambient particle in hero section
  const heroEl = document.getElementById('hero');
  const spawnAmbient = () => {
    const p = getParticle();
    if (!p) return;
    const rect = heroEl ? heroEl.getBoundingClientRect() : { left: 0, top: 0, width: w, height: h };
    p.x = rect.left + Math.random() * rect.width;
    p.y = rect.top + rect.height + 10;
    p.vx = (Math.random() - 0.5) * 0.3;
    p.vy = -(0.3 + Math.random() * 0.5);
    p.size = 2 + Math.random() * 2;
    p.alpha = 0.4 + Math.random() * 0.3;
    p.maxLife = 180 + Math.random() * 120; // frames
    p.life = 0;
    p.color = Math.random() > 0.5 ? '#149ddd' : '#173b6c';
    p.type = 'ambient';
    p.gravity = 0;
    p.active = true;
  };

  // Spawn burst particles at position
  const spawnBurst = (x, y, count = 12) => {
    for (let i = 0; i < count; i++) {
      const p = getParticle();
      if (!p) return;
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 2.5;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 2 + Math.random() * 2;
      p.alpha = 0.8;
      p.maxLife = 25 + Math.random() * 15;
      p.life = 0;
      p.color = '#149ddd';
      p.type = 'burst';
      p.gravity = 0.05;
      p.active = true;
    }
  };

  // Spawn trail particle at mouse
  const spawnTrail = () => {
    if (!inHero) return;
    const p = getParticle();
    if (!p) return;
    p.x = mouseX + (Math.random() - 0.5) * 8;
    p.y = mouseY + (Math.random() - 0.5) * 8;
    p.vx = (Math.random() - 0.5) * 0.2;
    p.vy = (Math.random() - 0.5) * 0.2;
    p.size = 1.5 + Math.random() * 1.5;
    p.alpha = 0.6;
    p.maxLife = 20;
    p.life = 0;
    p.color = '#149ddd';
    p.type = 'trail';
    p.gravity = 0;
    p.active = true;
  };

  // Track mouse
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (inHero) spawnTrail();
  });

  // Track hero section visibility
  engine.on('section:enter', ({ id }) => {
    inHero = id === 'hero';
  });

  // Click bursts
  engine.on('click:project', ({ event }) => {
    spawnBurst(event.clientX, event.clientY);
  });

  // Also burst on nav clicks
  document.querySelector('#navbar')?.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      const rect = e.target.closest('a').getBoundingClientRect();
      spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 8);
    }
  });

  // Ambient spawner
  let ambientTimer = 0;
  const ambientInterval = isMobile ? 30 : 15; // frames between spawns

  // Render loop
  const render = () => {
    if (!animating) return;

    ctx.clearRect(0, 0, w, h);

    // Spawn ambient particles
    ambientTimer++;
    const activeAmbient = particles.filter(p => p.active && p.type === 'ambient').length;
    if (ambientTimer >= ambientInterval && activeAmbient < maxAmbient) {
      spawnAmbient();
      ambientTimer = 0;
    }

    // Update & draw
    for (const p of particles) {
      if (!p.active) continue;

      p.life++;
      if (p.life >= p.maxLife) { p.active = false; continue; }

      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;

      // Fade out in last 30% of life
      const fadeStart = p.maxLife * 0.7;
      const alpha = p.life > fadeStart
        ? p.alpha * (1 - (p.life - fadeStart) / (p.maxLife - fadeStart))
        : p.alpha;

      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(render);
  };

  // Visibility pause — stop loop entirely when hidden, restart when visible
  engine.on('visibility:hidden', () => { animating = false; });
  engine.on('visibility:visible', () => { animating = true; render(); });

  render();
});
```

- [ ] **Step 2: Add script tag to index.html**

Add after the cursor module script tag:

```html
  <script src="assets/js/modules/particles.js"></script>
```

- [ ] **Step 3: Verify in browser**

Open `index.html`. Verify:
- Canvas is behind page content, not blocking clicks
- Small colored squares drift upward in the hero section
- Moving mouse in hero section leaves a subtle sparkle trail
- Clicking a project card creates a burst of particles
- Scrolling past hero section: trail stops, ambient particles only in hero area
- Switching tabs and back: no frozen or glitched particles

- [ ] **Step 4: Commit**

```bash
git add assets/js/modules/particles.js index.html
git commit -m "feat: add particle effects module with ambient, burst, and trail"
```

---

### Task 4: Game UI Module — XP Bars, Quest Headers, Achievement Toasts

**Files:**
- Create: `assets/js/modules/game-ui.js`
- Modify: `index.html` — uncomment skills section, restyle as XP bars, add quest labels, add script tag
- Modify: `assets/css/style.css` — add game UI styles

This is the largest task. It has three sub-features: XP bars, quest headers, and achievement toasts.

- [ ] **Step 1: Add game UI CSS to style.css**

Append to `assets/css/style.css`:

```css
/* ======= Portfolio Engine: Game UI Module ======= */

/* --- XP Skill Bars --- */
.xp-bar {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 12px;
}

.xp-bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  margin-bottom: 4px;
}

.xp-bar-name {
  font-weight: 600;
  color: #fff;
}

.xp-bar-flavor {
  opacity: 0.4;
  font-family: monospace;
  font-size: 0.75rem;
  margin-left: 8px;
}

.xp-bar-level {
  color: #10b981;
  font-size: 0.8rem;
  font-weight: 600;
}

.xp-bar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  height: 8px;
  overflow: hidden;
}

.xp-bar-fill {
  height: 100%;
  width: 0;
  border-radius: 3px;
  background: linear-gradient(90deg, #10b981, #34d399);
  transition: width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* --- Quest-Style Section Headers --- */
.quest-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: #149ddd;
  opacity: 0.7;
  text-align: center;
  margin-bottom: 2px;
}

.quest-subtitle {
  font-size: 0.75rem;
  opacity: 0.4;
  text-align: center;
  margin-top: 2px;
}

/* --- Achievement Toasts --- */
.pe-toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 99998;
  pointer-events: none;
}

.pe-toast {
  background: rgba(4, 11, 20, 0.95);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-left: 4px solid #10b981;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 280px;
  max-width: 360px;
  transform: translateX(120%);
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  margin-top: 8px;
}

.pe-toast.pe-toast--visible {
  transform: translateX(0);
}

.pe-toast-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.pe-toast-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #10b981;
}

.pe-toast-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
}

.pe-toast-desc {
  font-size: 0.75rem;
  opacity: 0.6;
  color: #ccc;
}
```

- [ ] **Step 2: Uncomment and restyle skills section in index.html**

In `index.html`, replace the commented-out Skills Section (lines 534-626) with a new XP-bar styled version. Uncomment it and restructure:

Replace the entire `<!-- ======= Skills Section ======= -->` through `<!-- End Skills Section -->` block (lines 534-626) with:

```html
     <!-- ======= Skills Section ======= -->
    <section id="skills" class="skills">
      <div class="container">

        <div class="section-title">
          <div class="quest-label">— INVENTORY —</div>
          <h2>Skills</h2>
        </div>

        <div class="row skills-content">

          <div class="col-lg-6" data-aos="fade-up">
            <div class="xp-bar" data-xp="90" data-flavor="// PRIMARY WEAPON">
              <div class="xp-bar-header">
                <span><span class="xp-bar-name">C#</span><span class="xp-bar-flavor">// PRIMARY WEAPON</span></span>
                <span class="xp-bar-level">LVL 9</span>
              </div>
              <div class="xp-bar-track"><div class="xp-bar-fill"></div></div>
            </div>

            <div class="xp-bar" data-xp="80">
              <div class="xp-bar-header">
                <span><span class="xp-bar-name">JavaScript / TypeScript</span></span>
                <span class="xp-bar-level">LVL 8</span>
              </div>
              <div class="xp-bar-track"><div class="xp-bar-fill"></div></div>
            </div>

            <div class="xp-bar" data-xp="75">
              <div class="xp-bar-header">
                <span><span class="xp-bar-name">HTML / CSS</span></span>
                <span class="xp-bar-level">LVL 7</span>
              </div>
              <div class="xp-bar-track"><div class="xp-bar-fill"></div></div>
            </div>

            <div class="xp-bar" data-xp="70">
              <div class="xp-bar-header">
                <span><span class="xp-bar-name">Python</span></span>
                <span class="xp-bar-level">LVL 7</span>
              </div>
              <div class="xp-bar-track"><div class="xp-bar-fill"></div></div>
            </div>

            <div class="xp-bar" data-xp="60">
              <div class="xp-bar-header">
                <span><span class="xp-bar-name">C++</span></span>
                <span class="xp-bar-level">LVL 6</span>
              </div>
              <div class="xp-bar-track"><div class="xp-bar-fill"></div></div>
            </div>
          </div>

          <div class="col-lg-6" data-aos="fade-up" data-aos-delay="100">
            <div class="xp-bar" data-xp="95" data-flavor="// ENGINE MASTERY">
              <div class="xp-bar-header">
                <span><span class="xp-bar-name">Unity</span><span class="xp-bar-flavor">// ENGINE MASTERY</span></span>
                <span class="xp-bar-level">LVL 9</span>
              </div>
              <div class="xp-bar-track"><div class="xp-bar-fill"></div></div>
            </div>

            <div class="xp-bar" data-xp="85">
              <div class="xp-bar-header">
                <span><span class="xp-bar-name">Blender / Maya</span></span>
                <span class="xp-bar-level">LVL 8</span>
              </div>
              <div class="xp-bar-track"><div class="xp-bar-fill"></div></div>
            </div>

            <div class="xp-bar" data-xp="50">
              <div class="xp-bar-header">
                <span><span class="xp-bar-name">Unreal</span></span>
                <span class="xp-bar-level">LVL 5</span>
              </div>
              <div class="xp-bar-track"><div class="xp-bar-fill"></div></div>
            </div>

            <div class="xp-bar" data-xp="75">
              <div class="xp-bar-header">
                <span><span class="xp-bar-name">After Effects / VideoPad</span></span>
                <span class="xp-bar-level">LVL 7</span>
              </div>
              <div class="xp-bar-track"><div class="xp-bar-fill"></div></div>
            </div>

            <div class="xp-bar" data-xp="80">
              <div class="xp-bar-header">
                <span><span class="xp-bar-name">Git</span></span>
                <span class="xp-bar-level">LVL 8</span>
              </div>
              <div class="xp-bar-track"><div class="xp-bar-fill"></div></div>
            </div>
          </div>

        </div>
      </div>
    </section>
    <!-- End Skills Section -->
```

- [ ] **Step 3: Add quest labels to existing section headers**

In `index.html`, add quest labels to existing section titles. For each section-title div:

**Portfolio section** (inside `.section-title` around line 81):
Add `<div class="quest-label">— FEATURED WORKS —</div>` before the `<h2>`.

**About section** (inside `.section-title` around line 458):
Add `<div class="quest-label">— CHARACTER INFO —</div>` before the `<h2>`.

**Resume section** (inside `.section-title` around line 630):
Add `<div class="quest-label">— QUEST LOG —</div>` before the `<h2>`.

Also uncomment the Skills nav link in the navbar (line 59) and add `data-engine-hover="nav"` to it.

- [ ] **Step 4: Create the game-ui module**

Create `assets/js/modules/game-ui.js`:

```javascript
/**
 * Game UI Module — XP bars, quest headers, achievement toasts.
 */
PortfolioEngine.register('game-ui', (engine) => {
  // --- XP Bar Animation ---
  const skillsSection = document.querySelector('.skills-content');
  if (skillsSection && 'IntersectionObserver' in window) {
    let animated = false;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !animated) {
          animated = true;
          document.querySelectorAll('.xp-bar').forEach(bar => {
            const xp = bar.getAttribute('data-xp');
            const fill = bar.querySelector('.xp-bar-fill');
            if (fill && xp) {
              setTimeout(() => { fill.style.width = xp + '%'; }, 100);
            }
          });
        }
      });
    }, { threshold: 0.2 });
    observer.observe(skillsSection);
  }

  // --- Achievement Toast System ---
  const toastContainer = document.createElement('div');
  toastContainer.className = 'pe-toast-container';
  document.body.appendChild(toastContainer);

  const shown = JSON.parse(sessionStorage.getItem('pe-achievements') || '[]');
  const queue = [];
  let toastActive = false;

  const showToast = (achievement) => {
    if (shown.includes(achievement.id)) return;
    if (toastActive) { queue.push(achievement); return; }

    toastActive = true;
    shown.push(achievement.id);
    sessionStorage.setItem('pe-achievements', JSON.stringify(shown));

    const toast = document.createElement('div');
    toast.className = 'pe-toast';
    toast.innerHTML = `
      <div class="pe-toast-icon">${achievement.icon}</div>
      <div>
        <div class="pe-toast-label">Achievement Unlocked</div>
        <div class="pe-toast-title">${achievement.title}</div>
        <div class="pe-toast-desc">${achievement.desc}</div>
      </div>
    `;
    toastContainer.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { toast.classList.add('pe-toast--visible'); });
    });

    // Auto dismiss
    setTimeout(() => {
      toast.classList.remove('pe-toast--visible');
      setTimeout(() => {
        toast.remove();
        toastActive = false;
        if (queue.length) showToast(queue.shift());
      }, 400);
    }, 4000);
  };

  // --- Achievement Triggers ---

  // Explorer: scrolled past 50%
  let explorerChecked = false;
  window.addEventListener('scroll', () => {
    if (explorerChecked) return;
    const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    if (scrollPercent > 0.5) {
      explorerChecked = true;
      showToast({ id: 'explorer', icon: '🗺️', title: 'Explorer', desc: 'Scrolled past the halfway point' });
    }
  });

  // Deep Diver: scrolled to bottom
  let diverChecked = false;
  window.addEventListener('scroll', () => {
    if (diverChecked) return;
    const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    if (scrollPercent > 0.95) {
      diverChecked = true;
      showToast({ id: 'deep-diver', icon: '🏆', title: 'Deep Diver', desc: 'Scrolled to the bottom of the page' });
    }
  });

  // Curious: clicked 3+ project cards
  let projectClicks = 0;
  engine.on('click:project', () => {
    projectClicks++;
    if (projectClicks === 3) {
      showToast({ id: 'curious', icon: '🔍', title: 'Curious', desc: 'Explored 3 different projects' });
    }
  });

  // Gamer: played arcade for 30+ seconds (triggered by arcade module)
  engine.on('arcade:milestone', () => {
    showToast({ id: 'gamer', icon: '🎮', title: 'Gamer', desc: 'Tried the arcade!' });
  });
});
```

- [ ] **Step 5: Add script tag to index.html**

Add after the particles module script tag:

```html
  <script src="assets/js/modules/game-ui.js"></script>
```

- [ ] **Step 6: Verify in browser**

Open `index.html`. Verify:
- Skills section is visible with XP-bar styling
- XP bars animate when scrolled into view (fill from 0 to their target width)
- Quest labels appear above section titles ("— FEATURED WORKS —", etc.)
- Scroll past 50% of page: "Explorer" achievement toast slides in from bottom-right
- Scroll to bottom: "Deep Diver" toast appears
- Toast auto-dismisses after ~4 seconds
- Refresh page: achievements don't repeat (sessionStorage)

- [ ] **Step 7: Commit**

```bash
git add assets/js/modules/game-ui.js assets/css/style.css index.html
git commit -m "feat: add game UI module with XP bars, quest headers, and achievements"
```

---

### Task 5: Arcade Module — Embedded Game Section

**Files:**
- Create: `assets/js/modules/arcade.js`
- Modify: `index.html` — add arcade section HTML, add script tag, add nav link
- Modify: `assets/css/style.css` — add arcade section styles

- [ ] **Step 1: Resolve the itch.io embed URL**

Visit `https://acemoisan.itch.io/pdkm` and find the embed URL. The itch.io embed format is `https://v6p9d9t4.ssl.hwcdn.net/html/GAME_ID/index.html` or use the itch.io embed widget `https://itch.io/embed-upload/GAME_ID?color=149ddd`. Check the page source or use the itch.io embed tool to get the correct URL. Save this URL for use in step 3.

If the exact embed URL can't be resolved statically, use the itch.io widget embed format: `<iframe src="https://itch.io/embed/GAME_SLUG" ...>` as a fallback. The game slug from the URL is `pdkm`.

- [ ] **Step 2: Add arcade CSS to style.css**

Append to `assets/css/style.css`:

```css
/* ======= Portfolio Engine: Arcade Module ======= */
.arcade {
  padding: 60px 0;
}

.arcade-container {
  position: relative;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  aspect-ratio: 16 / 9;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid #149ddd;
  border-radius: 8px;
  overflow: hidden;
}

.arcade-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(4, 11, 20, 0.85);
  z-index: 2;
  cursor: pointer;
  transition: opacity 0.3s;
}

.arcade-overlay.pe-hidden {
  opacity: 0;
  pointer-events: none;
}

.arcade-overlay-icon {
  font-size: 3rem;
  margin-bottom: 8px;
}

.arcade-overlay-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #fff;
}

.arcade-overlay-sub {
  font-size: 0.85rem;
  opacity: 0.6;
  margin-bottom: 16px;
}

.arcade-play-btn {
  background: #149ddd;
  color: #fff;
  border: none;
  padding: 10px 32px;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.arcade-play-btn:hover {
  background: #1178aa;
}

.arcade-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.arcade-fullscreen-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 0.75rem;
  cursor: pointer;
  z-index: 3;
  opacity: 0;
  transition: opacity 0.2s;
}

.arcade-container:hover .arcade-fullscreen-btn {
  opacity: 1;
}
```

- [ ] **Step 3: Add arcade section HTML to index.html**

In `index.html`, add the arcade section after the Portfolio section closing tag (after line 449 `</section><!-- End Portfolio Section -->`) and before the About section:

```html

    <!-- ======= Arcade Section ======= -->
    <section id="arcade" class="arcade section-bg">
      <div class="container">

        <div class="section-title">
          <div class="quest-label">— ARCADE —</div>
          <h2>Play PDKM</h2>
          <p>Try one of my games right here — no download needed</p>
        </div>

        <div class="arcade-container" data-engine-hover="arcade">
          <div class="arcade-overlay" id="arcade-overlay">
            <div class="arcade-overlay-icon">🕹️</div>
            <div class="arcade-overlay-title">PDKM</div>
            <div class="arcade-overlay-sub">Click to play in browser</div>
            <button class="arcade-play-btn" data-engine-click="arcade-play">▶ PLAY</button>
          </div>
          <button class="arcade-fullscreen-btn" id="arcade-fullscreen">⛶ Fullscreen</button>
          <!-- iframe injected by arcade.js on play -->
        </div>

      </div>
    </section>
    <!-- End Arcade Section -->
```

- [ ] **Step 4: Add arcade nav link**

In `index.html`, add an Arcade nav link in the `#navbar ul`, after the Projects link:

```html
          <li><a href="#arcade" class="nav-link scrollto" data-engine-hover="nav"><i class="bx bx-joystick"></i> <span>Arcade</span></a></li>
```

- [ ] **Step 5: Create the arcade module**

Create `assets/js/modules/arcade.js`:

```javascript
/**
 * Arcade Module — lazy-loaded embedded itch.io game.
 */
PortfolioEngine.register('arcade', (engine) => {
  const container = document.querySelector('.arcade-container');
  const overlay = document.getElementById('arcade-overlay');
  const fullscreenBtn = document.getElementById('arcade-fullscreen');
  if (!container || !overlay) return;

  // Use itch.io embed widget — replace GAME_ID with actual ID from step 1
  const EMBED_URL = 'https://itch.io/embed-upload/12648498?color=149ddd';
  let iframe = null;
  let playing = false;
  let playTimer = null;

  // Play button click
  engine.on('click:arcade-play', () => {
    if (playing) return;
    playing = true;

    // Inject iframe
    iframe = document.createElement('iframe');
    iframe.className = 'arcade-iframe';
    iframe.src = EMBED_URL;
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('allow', 'autoplay; fullscreen');
    container.appendChild(iframe);

    // Hide overlay
    overlay.classList.add('pe-hidden');

    engine.emit('arcade:start');

    // 30-second milestone
    playTimer = setTimeout(() => {
      engine.emit('arcade:milestone');
    }, 30000);
  });

  // Fullscreen toggle
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      }
    });
  }

  // Stop on ESC from fullscreen
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && playing) {
      engine.emit('arcade:stop');
    }
  });
});
```

**Note:** The `EMBED_URL` constant needs the real game ID. During implementation, visit `https://acemoisan.itch.io/pdkm`, view page source, and find the embed-upload URL. Update the constant accordingly. If the exact upload ID isn't accessible, use the widget embed: `https://itch.io/embed/GAME_SLUG`.

- [ ] **Step 6: Add script tag to index.html**

Add after the game-ui module script tag:

```html
  <script src="assets/js/modules/arcade.js"></script>
```

- [ ] **Step 7: Verify in browser**

Open `index.html`. Verify:
- Arcade section appears between Portfolio and About
- Play button overlay is visible with styled container
- Clicking Play: overlay fades, iframe loads the game
- Custom cursor hides when hovering the game area (after play starts)
- After 30 seconds: "Gamer" achievement toast appears
- Fullscreen button appears on hover, works when clicked
- Arcade link in sidebar nav scrolls to the section

- [ ] **Step 8: Commit**

```bash
git add assets/js/modules/arcade.js assets/css/style.css index.html
git commit -m "feat: add arcade module with embedded PDKM game"
```

---

### Task 6: Integration & Polish

**Files:**
- Modify: `index.html` — ensure all data attributes are in place
- Modify: `assets/css/style.css` — any adjustments for mobile/polish

Final pass to make sure all modules work together and the site looks polished.

- [ ] **Step 1: Add remaining data-engine-hover attributes**

Review `index.html` and ensure all interactive elements have proper data attributes:

- All `#navbar a` elements: `data-engine-hover="nav"`
- All `.social-links a` elements: `data-engine-hover="link"`
- Portfolio item links/wrappers: `data-engine-hover="project"` and `data-engine-click="project"`
- Arcade container: `data-engine-hover="arcade"` (already added in Task 5)

- [ ] **Step 2: Add mobile-specific CSS**

Append to `assets/css/style.css` — ensure game UI degrades gracefully on mobile:

```css
/* ======= Portfolio Engine: Mobile Adjustments ======= */
@media (max-width: 768px) {
  .pe-cursor { display: none !important; }

  .pe-toast {
    min-width: auto;
    max-width: 280px;
    right: 12px;
    bottom: 12px;
  }

  .arcade-container {
    aspect-ratio: 4 / 3; /* taller on mobile for better playability */
  }

  .quest-label {
    font-size: 0.6rem;
    letter-spacing: 2px;
  }
}
```

- [ ] **Step 3: Add .superpowers to .gitignore**

Check if `.gitignore` exists. If so, append `.superpowers/` to it. If not, create it with:

```
.superpowers/
```

- [ ] **Step 4: Full integration test**

Open `index.html` in browser. Walk through the complete experience:
1. Page loads — particles drift in hero section, cursor is custom glowing dot
2. Move mouse — sparkle trail in hero section
3. Hover nav items — cursor ring expands
4. Click a nav item — particle burst at click point
5. Scroll to Portfolio — quest label visible ("— FEATURED WORKS —")
6. Hover project cards — cursor changes to green crosshair style
7. Click 3 project cards — "Curious" achievement toast appears
8. Scroll to Arcade — quest label visible ("— ARCADE —")
9. Click Play — game loads, cursor hides over game area
10. Wait 30 seconds — "Gamer" achievement toast
11. Scroll to Skills — XP bars animate filling up
12. Scroll past 50% — "Explorer" achievement
13. Scroll to bottom — "Deep Diver" achievement
14. Check DevTools console — no errors
15. Check on mobile viewport (DevTools responsive mode) — cursor hidden, particles at half density, layout intact

- [ ] **Step 5: Final commit**

```bash
git add assets/css/style.css index.html .gitignore
git commit -m "feat: complete game layer integration and mobile polish"
```
