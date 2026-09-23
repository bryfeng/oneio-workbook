const navLinks = [...document.querySelectorAll('.view-tabs a')];
const sections = navLinks.map(link => document.querySelector(link.hash));
let scheduled = false;
function updateSection() {
  const passed = sections.filter(section => section.getBoundingClientRect().top <= 110);
  const current = passed.at(-1) || sections[0];
  navLinks.forEach(link => {
    if (link.hash === `#${current.id}`) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
  scheduled = false;
}
window.addEventListener('scroll', () => {
  if (!scheduled) { scheduled = true; requestAnimationFrame(updateSection); }
}, { passive: true });
window.addEventListener('resize', updateSection);
document.addEventListener('toggle', updateSection, true);
updateSection();
