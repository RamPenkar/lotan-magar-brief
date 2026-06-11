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
