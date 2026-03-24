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
