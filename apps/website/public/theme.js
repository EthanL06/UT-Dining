(() => {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const stored = () => {
    try {
      const value = localStorage.getItem('theme');
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  };
  const apply = (theme) => {
    root.setAttribute('data-theme', theme);
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }
  };
  apply(stored() || (media.matches ? 'dark' : 'light'));
  media.addEventListener('change', (event) => {
    if (!stored()) apply(event.matches ? 'dark' : 'light');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    for (const menu of document.querySelectorAll('details[data-menu][open]')) {
      menu.removeAttribute('open');
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.getAttribute('data-theme') || 'light');
  });
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    for (const menu of document.querySelectorAll('details[data-menu][open]')) {
      if (!menu.contains(event.target) || event.target.closest('a')) menu.removeAttribute('open');
    }
    if (!event.target.closest('[data-theme-toggle]')) return;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('theme', next);
    } catch {}
    apply(next);
  });
})();
