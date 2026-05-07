// =====================
// SCROLL ANIMATIONS
// Fade-in cards as they enter the viewport
// =====================

function setupScrollAnimations() {
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px 40px 0px' }
  );

  document.querySelectorAll(
    '.hiw__step, .why__card, .testimonials__card, .example__aside-item'
  ).forEach((el, i) => {
    el.style.setProperty('--anim-delay', `${i * 0.05}s`);
    el.classList.add('animate-on-scroll');
    observer.observe(el);
  });
}

// =====================
// CONFETTI CELEBRATION
// Triggered when the interest form is submitted successfully
// =====================

function triggerCelebration() {
  const container = document.querySelector('.cta__form-wrap');
  if (!container) return;

  const emojis = ['🎉', '✨', '🏆', '🎯', '🎮', '⚽'];
  const count = 22;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'confetti-piece';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    const drift = (Math.random() - 0.5) * 180;
    el.style.cssText = `
      position: absolute;
      font-size: ${Math.random() * 12 + 16}px;
      left: ${Math.random() * 100}%;
      top: 60%;
      --drift: ${drift};
      animation: confetti-fly ${Math.random() * 1.2 + 0.8}s ease-out ${Math.random() * 0.5}s forwards;
      pointer-events: none;
      z-index: 10;
    `;
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// =====================
// INIT
// =====================

document.addEventListener('DOMContentLoaded', () => {
  setupScrollAnimations();
});
