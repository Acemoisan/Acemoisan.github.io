/**
 * Arcade Module — lazy-loaded embedded itch.io game.
 */
PortfolioEngine.register('arcade', (engine) => {
  const container = document.querySelector('.arcade-container');
  const overlay = document.getElementById('arcade-overlay');
  const fullscreenBtn = document.getElementById('arcade-fullscreen');
  if (!container || !overlay) return;

  // itch.io embed for PDKM (game ID: 2487984)
  // TODO: Replace with embed-upload URL from itch.io dashboard for playable embed
  const EMBED_URL = 'https://itch.io/embed/2487984?dark=true';
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

  // Clear play timer on stop
  engine.on('arcade:stop', () => {
    if (playTimer) clearTimeout(playTimer);
  });

  // Stop on ESC from fullscreen
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && playing) {
      engine.emit('arcade:stop');
    }
  });
});
