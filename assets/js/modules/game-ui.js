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

  // First Click: clicked any project card
  let firstClickDone = false;
  engine.on('click:project', () => {
    if (firstClickDone) return;
    firstClickDone = true;
    showToast({ id: 'first-click', icon: '👆', title: 'First Contact', desc: 'Clicked your first project' });
  });

  // Networker: clicked a social link
  let socialClicked = false;
  engine.on('hover:link', () => {
    // Track actual clicks on social links
  });
  document.querySelector('.social-links')?.addEventListener('click', (e) => {
    if (socialClicked) return;
    if (e.target.closest('a')) {
      socialClicked = true;
      showToast({ id: 'networker', icon: '🤝', title: 'Networker', desc: 'Checked out a social link' });
    }
  });

  // Skill Scout: scrolled to the skills section
  const skillsEl = document.getElementById('skills');
  if (skillsEl && 'IntersectionObserver' in window) {
    const skillsObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          showToast({ id: 'skill-scout', icon: '⚔️', title: 'Skill Scout', desc: 'Viewed the inventory' });
          skillsObs.disconnect();
        }
      });
    }, { threshold: 0.3 });
    skillsObs.observe(skillsEl);
  }

  // Cinephile: watched the video (scrolled to it / it became visible)
  const videoIframe = document.querySelector('#portfolio iframe[src*="youtube"]');
  if (videoIframe && 'IntersectionObserver' in window) {
    const videoObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          showToast({ id: 'cinephile', icon: '🎬', title: 'Cinephile', desc: 'Found the featured trailer' });
          videoObs.disconnect();
        }
      });
    }, { threshold: 0.5 });
    videoObs.observe(videoIframe);
  }

  // Speed Reader: scrolled to resume section
  const resumeEl = document.getElementById('resume');
  if (resumeEl && 'IntersectionObserver' in window) {
    const resumeObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          showToast({ id: 'recruiter', icon: '📋', title: 'Recruiter', desc: 'Reviewed the quest log' });
          resumeObs.disconnect();
        }
      });
    }, { threshold: 0.2 });
    resumeObs.observe(resumeEl);
  }
});
