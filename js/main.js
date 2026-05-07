// =====================
// NAVIGATION — sticky + mobile drawer
// =====================

const nav = document.getElementById('nav');
const navBurger = document.getElementById('navBurger');
const navDrawer = document.getElementById('navDrawer');
const navOverlay = document.getElementById('navOverlay');

// Apply .scrolled class after scrolling 40px
function onScroll() {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll(); // run once on load in case page is already scrolled

// Mobile menu open / close
function openMenu() {
  navBurger.classList.add('open');
  navBurger.setAttribute('aria-expanded', 'true');
  navDrawer.classList.add('open');
  navDrawer.setAttribute('aria-hidden', 'false');
  navOverlay.classList.add('open');
  nav.classList.add('menu-open');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  navBurger.classList.remove('open');
  navBurger.setAttribute('aria-expanded', 'false');
  navDrawer.classList.remove('open');
  navDrawer.setAttribute('aria-hidden', 'true');
  navOverlay.classList.remove('open');
  nav.classList.remove('menu-open');
  document.body.style.overflow = '';
}

navBurger.addEventListener('click', () => {
  navBurger.classList.contains('open') ? closeMenu() : openMenu();
});
navOverlay.addEventListener('click', closeMenu);
navDrawer.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

// Close on resize past breakpoint
window.addEventListener('resize', () => {
  if (window.innerWidth >= 1024) closeMenu();
});

// =====================
// SMOOTH SCROLL (offset for fixed nav)
// =====================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const id = anchor.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const navHeight = nav.offsetHeight;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// =====================
// INTEREST FORM — validation + thank-you state
// =====================

const form = document.getElementById('interestForm');
const emailInput = document.getElementById('emailInput');
const formError = document.getElementById('formError');
const formSuccess = document.getElementById('formSuccess');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(msg) {
  formError.textContent = msg;
  emailInput.classList.add('error');
  emailInput.setAttribute('aria-invalid', 'true');
}

function clearError() {
  formError.textContent = '';
  emailInput.classList.remove('error');
  emailInput.removeAttribute('aria-invalid');
}

emailInput.addEventListener('input', clearError);

form.addEventListener('submit', e => {
  e.preventDefault();
  clearError();

  const email = emailInput.value.trim();

  if (!email) {
    showError('Please enter your email address.');
    emailInput.focus();
    return;
  }

  if (!isValidEmail(email)) {
    showError('Please enter a valid email address.');
    emailInput.focus();
    return;
  }

  // -----------------------------------------------------------------
  // FUTURE INTEGRATION POINT
  // Replace the showSuccess() call below with a real API call, e.g.:
  //
  //   const data = new FormData();
  //   data.append('email', email);
  //   fetch('https://formspree.io/f/YOUR_FORM_ID', {
  //     method: 'POST',
  //     body: data,
  //     headers: { 'Accept': 'application/json' }
  //   })
  //   .then(r => r.ok ? showSuccess() : showError('Something went wrong. Please try again.'))
  //   .catch(() => showError('Something went wrong. Please try again.'));
  //
  // For now, submissions are handled entirely in the browser.
  // -----------------------------------------------------------------

  showSuccess();
});

function showSuccess() {
  form.hidden = true;
  formSuccess.hidden = false;
  formSuccess.setAttribute('tabindex', '-1');
  formSuccess.focus();
  if (typeof triggerCelebration === 'function') triggerCelebration();
}
