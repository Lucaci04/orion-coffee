'use strict';

document.documentElement.classList.add('js');

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function setMenu(open) {
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Închide navigarea' : 'Deschide navigarea');
  navigation.classList.toggle('is-open', open);
}
menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuButton.focus();
  }
});
document.addEventListener('click', event => {
  if (menuButton && !event.target.closest('.header') && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false);
});
window.matchMedia('(min-width: 761px)').addEventListener('change', event => {
  if (event.matches && menuButton) setMenu(false);
});

const photos = [
  { src: 'assets/images/coffee-table.jpg', title: 'O cafea împreună', alt: 'Trei persoane ciocnesc cești de cafea. Grafică generată.' },
  { src: 'assets/images/coffee-hero.jpg', title: 'O clipă de liniște', alt: 'Cești cu latte art pe o masă de lemn, între plante. Grafică generată.' },
  { src: 'assets/images/coffee-detail.jpg', title: 'Gesturi mici', alt: 'Cafea preparată într-un filtru. Grafică generată.' }
];
const lightbox = document.querySelector('.lightbox');
let photoIndex = 0;
let galleryOpener;
function showPhoto(index) {
  photoIndex = (index + photos.length) % photos.length;
  const photo = photos[photoIndex];
  const image = document.querySelector('#lightbox-image');
  image.src = photo.src;
  image.alt = photo.alt;
  document.querySelector('#lightbox-caption').textContent = photo.title;
  document.querySelector('#lightbox-counter').textContent = `${photoIndex + 1} / ${photos.length}`;
}
document.querySelectorAll('.gallery-open').forEach(link => {
  link.addEventListener('click', event => {
    if (!lightbox?.showModal) return;
    event.preventDefault();
    galleryOpener = link;
    showPhoto(Number(link.dataset.photo));
    lightbox.showModal();
    document.body.classList.add('modal-open');
    document.querySelector('#close-lightbox').focus();
  });
});
document.querySelector('#close-lightbox')?.addEventListener('click', () => lightbox.close());
document.querySelector('#previous-photo')?.addEventListener('click', () => showPhoto(photoIndex - 1));
document.querySelector('#next-photo')?.addEventListener('click', () => showPhoto(photoIndex + 1));
lightbox?.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(photoIndex + 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(photoIndex - 1); }
});
lightbox?.addEventListener('click', event => {
  if (event.target !== lightbox) return;
  const box = lightbox.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) lightbox.close();
});
lightbox?.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  galleryOpener?.focus({ preventScroll: true });
});

const address = 'Bulevardul Exemplului nr. 8, Constanța, 900000, România';
document.querySelector('.copy-address')?.addEventListener('click', async () => {
  const status = document.querySelector('.copy-status');
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(address);
    status.textContent = 'Adresa a fost copiată.';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('address'));
    selection.removeAllRanges();
    selection.addRange(range);
    status.textContent = 'Adresa este selectată. Copiaz-o din meniul dispozitivului.';
  }
});

document.querySelector('#load-map')?.addEventListener('click', () => {
  const container = document.querySelector('#map-frame');
  const frame = document.createElement('iframe');
  frame.title = 'Locația Orion Coffee — Bulevardul Exemplului nr. 8, Constanța';
  frame.src = 'https://www.google.com/maps/search/?api=1&query=Constan%C8%9Ba';
  frame.referrerPolicy = 'no-referrer-when-downgrade';
  frame.allowFullscreen = true;
  const note = document.createElement('p');
  note.className = 'map-load-note';
  note.textContent = 'Dacă harta nu apare, folosește linkul Google Maps de mai jos.';
  document.querySelector('#map-placeholder').hidden = true;
  container.hidden = false;
  container.append(frame, note);
  frame.focus();
});

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.ritual h2, .coffee-copy, .section-heading').forEach(element => observer.observe(element));
}
const year = document.querySelector('#year');
if (year) year.textContent = new Intl.DateTimeFormat('ro-RO', { year: 'numeric', timeZone: 'Europe/Bucharest' }).format(new Date());
