/* Word splitter for reveal-words elements.
   Handles RTL Hebrew by preserving DOM order; each word gets --i for stagger. */
function splitWords(el) {
  // Skip if already split or contains nested tags.
  if (el.dataset.split === '1') return;
  if (el.querySelector('.word')) return;
  const text = el.textContent.trim();
  if (!text) return;
  const parts = text.split(/(\s+)/);
  const frag = document.createDocumentFragment();
  let i = 0;
  for (const p of parts) {
    if (/^\s+$/.test(p)) {
      frag.appendChild(document.createTextNode(p));
    } else if (p.length) {
      const span = document.createElement('span');
      span.className = 'word';
      span.style.setProperty('--i', i++);
      span.textContent = p;
      frag.appendChild(span);
    }
  }
  el.textContent = '';
  el.appendChild(frag);
  el.dataset.split = '1';
}

/* Only split on elements without nested HTML formatting.
   Skip elements that contain <strong>, <em>, <span>, <a>, etc. */
document.querySelectorAll('.reveal-words').forEach(el => {
  const hasChildren = Array.from(el.children).some(c => c.tagName !== 'BR');
  if (!hasChildren) splitWords(el);
  else {
    // For elements with nested tags, just animate as block.
    el.classList.remove('reveal-words');
    el.classList.add('reveal');
  }
});

/* Reveal observer: triggers .in once on viewport entry. */
const revealObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      revealObserver.unobserve(e.target);
    }
  }
}, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal, .reveal-words').forEach(el => revealObserver.observe(el));

/* Section counter: updates corner display to current dominant section. */
const counter = document.querySelector('[data-counter]');
const sections = Array.from(document.querySelectorAll('[data-section]'));

const sectionObserver = new IntersectionObserver((entries) => {
  // Pick the entry closest to the top that's intersecting.
  let best = null;
  for (const e of entries) {
    if (e.isIntersecting) {
      if (!best || e.boundingClientRect.top < best.boundingClientRect.top) {
        best = e;
      }
    }
  }
  if (best && counter) {
    const num = best.target.getAttribute('data-section');
    if (num && counter.textContent !== num) {
      counter.textContent = num;
    }
  }
}, { threshold: [0.2, 0.5], rootMargin: '-30% 0px -50% 0px' });

sections.forEach(s => sectionObserver.observe(s));

/* Animated number counter for stat-num elements. */
const statObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const el = e.target;
    const target = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = Math.floor(eased * target);
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    };
    requestAnimationFrame(tick);
    statObserver.unobserve(el);
  }
}, { threshold: 0.5 });

document.querySelectorAll('[data-target]').forEach(el => statObserver.observe(el));

/* Hero scroll-scrubbed video.
   Video frames track scroll progress through the hero section. */
const heroEl = document.querySelector('.hero');
const heroBgEl = document.querySelector('.hero-bg');
const heroGridEl = document.querySelector('.hero-grid');

if (heroEl && heroBgEl && heroGridEl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let heroTicking = false;
  let targetTime = 0;
  let currentTime = 0;
  let rafId = null;

  // Smooth tween toward target currentTime so scrubbing doesn't jitter.
  const smoothScrub = () => {
    if (!heroBgEl.duration || isNaN(heroBgEl.duration)) {
      rafId = requestAnimationFrame(smoothScrub);
      return;
    }
    const diff = targetTime - currentTime;
    if (Math.abs(diff) > 0.005) {
      currentTime += diff * 0.18;
      try { heroBgEl.currentTime = currentTime; } catch (_) {}
      rafId = requestAnimationFrame(smoothScrub);
    } else {
      rafId = null;
    }
  };

  const updateHero = () => {
    const heroHeight = heroEl.offsetHeight;
    const scrollY = window.scrollY;
    const progress = Math.min(Math.max(scrollY / heroHeight, 0), 1);

    // Set target video time based on scroll progress.
    if (heroBgEl.duration && !isNaN(heroBgEl.duration)) {
      targetTime = progress * heroBgEl.duration;
      if (rafId === null) rafId = requestAnimationFrame(smoothScrub);
    }

    // Content: fade out as hero scrolls away.
    heroGridEl.style.opacity = String(Math.max(0, 1 - progress * 1.25));
    heroGridEl.style.transform = `translate3d(0, ${scrollY * -0.18}px, 0)`;

    heroTicking = false;
  };

  // iOS Safari: scroll-driven currentTime updates are blocked until the
  // video has actually started playing. We rely on the video tag's autoplay
  // (muted + playsinline allow it on iOS) to start the video, then on the
  // first 'playing' event we pause it and switch to scrub mode. By the time
  // the user touches the screen, the video is already primed.
  const onVideoPrimed = () => {
    try { heroBgEl.pause(); } catch (_) {}
    updateHero();
  };
  heroBgEl.addEventListener('playing', onVideoPrimed, { once: true });

  // Fallback for browsers that block autoplay entirely: prime on first touch.
  const unlockOnTouch = () => {
    const p = heroBgEl.play();
    if (p && typeof p.then === 'function') {
      p.then(() => { heroBgEl.pause(); updateHero(); }).catch(() => {});
    }
  };
  document.addEventListener('touchstart', unlockOnTouch, { once: true, passive: true });
  document.addEventListener('click', unlockOnTouch, { once: true, passive: true });

  window.addEventListener('scroll', () => {
    if (!heroTicking) {
      requestAnimationFrame(updateHero);
      heroTicking = true;
    }
  }, { passive: true });
}
