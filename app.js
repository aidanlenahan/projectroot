// Renders the project list from projects.json and handles the detail modal.

const list = document.querySelector('.projects');
const modal = document.getElementById('modal');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Images may be a plain path or { src, alt }.
function normalizeImages(images, title) {
  return (images || []).map((img, i) =>
    typeof img === 'string' ? { src: img, alt: `${title} screenshot ${i + 1}` } : img
  );
}

function renderList(projects) {
  list.replaceChildren(...projects.map(p => {
    const li = el('li');
    const isModal = p.open === 'modal' && p.modal;
    const a = el('a');
    a.href = isModal ? `#${p.id}` : p.link;
    if (!isModal && /^https?:/.test(p.link)) a.rel = 'noopener';

    a.append(el('span', 'title', p.title));
    const right = el('span', 'desc', p.summary);
    right.append(el('span', 'icon', isModal ? '+' : '↗'));
    a.append(right);

    if (isModal) {
      a.addEventListener('click', e => {
        e.preventDefault();
        openModal(p);
      });
    }
    li.append(a);
    return li;
  }));
}

function buildCarousel(images) {
  const wrap = el('div', 'carousel');
  const track = el('div', 'track');
  images.forEach(img => {
    const slide = el('div', 'slide');
    const image = el('img');
    image.src = img.src;
    image.alt = img.alt || '';
    image.loading = 'lazy';
    slide.append(image);
    track.append(slide);
  });
  wrap.append(track);
  if (images.length < 2) return wrap;

  const prev = el('button', 'nav prev', '‹');
  const next = el('button', 'nav next', '›');
  prev.setAttribute('aria-label', 'Previous image');
  next.setAttribute('aria-label', 'Next image');
  const dots = el('div', 'dots');
  const dotEls = images.map((_, i) => {
    const d = el('button');
    d.setAttribute('aria-label', `Image ${i + 1}`);
    d.addEventListener('click', () => go(i));
    dots.append(d);
    return d;
  });

  let index = 0;
  const go = i => {
    index = (i + images.length) % images.length;
    track.scrollTo({ left: track.clientWidth * index, behavior: 'smooth' });
  };
  const sync = () => {
    index = Math.round(track.scrollLeft / track.clientWidth);
    dotEls.forEach((d, i) => d.classList.toggle('active', i === index));
  };
  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  track.addEventListener('scroll', sync, { passive: true });
  wrap.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') go(index - 1);
    if (e.key === 'ArrowRight') go(index + 1);
  });
  requestAnimationFrame(sync);

  wrap.append(prev, next, dots);
  return wrap;
}

function openModal(p) {
  const body = modal.querySelector('.modal-body');
  const images = normalizeImages(p.modal.images, p.title);
  const parts = [];

  if (images.length) parts.push(buildCarousel(images));

  const text = el('div', 'modal-text');
  text.append(el('h2', null, p.title));
  text.append(el('p', null, p.modal.description || p.summary));
  if (p.tags?.length) {
    const tags = el('ul', 'tags');
    p.tags.forEach(t => tags.append(el('li', null, t)));
    text.append(tags);
  }
  if (p.link) {
    const link = el('a', 'button', 'Visit ↗');
    link.href = p.link;
    link.rel = 'noopener';
    text.append(link);
  }
  parts.push(text);

  body.replaceChildren(...parts);
  history.replaceState(null, '', `#${p.id}`);
  modal.showModal();
}

modal.querySelector('.close').addEventListener('click', () => modal.close());
// Clicks on the backdrop land on the <dialog> itself, not its content.
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
modal.addEventListener('close', () => history.replaceState(null, '', location.pathname));

fetch('projects.json')
  .then(r => r.json())
  .then(({ projects }) => {
    renderList(projects);
    // Deep link: project.alenahan.net/#homelab opens that project's modal.
    const linked = projects.find(p => `#${p.id}` === location.hash && p.modal);
    if (linked) openModal(linked);
  })
  .catch(() => list.replaceChildren(el('li', 'error', 'Couldn’t load projects.')));
