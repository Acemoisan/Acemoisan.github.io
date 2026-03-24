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
