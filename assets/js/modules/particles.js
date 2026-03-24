/**
 * Particles Module — canvas-based pixel-art particle effects.
 * Ambient hero particles, click bursts, mouse trail.
 */
PortfolioEngine.register('particles', (engine) => {
  const canvas = document.createElement('canvas');
  canvas.className = 'pe-particles-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
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

  // Spawn ambient particles in hero and featured sections
  const heroEl = document.getElementById('hero');
  const featuredEl = document.getElementById('portfolio');
  const ambientSections = [heroEl, featuredEl].filter(Boolean);

  const spawnAmbient = () => {
    const target = ambientSections[Math.floor(Math.random() * ambientSections.length)];
    const p = getParticle();
    if (!p || !target) return;
    const rect = target.getBoundingClientRect();
    // Only spawn if section is at least partially visible
    if (rect.bottom < 0 || rect.top > h) return;
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

  // Track mouse — check if cursor is within hero or featured bounds
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    inHero = ambientSections.some(el => {
      const rect = el.getBoundingClientRect();
      return e.clientY >= rect.top && e.clientY <= rect.bottom;
    });
    if (inHero) spawnTrail();
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
