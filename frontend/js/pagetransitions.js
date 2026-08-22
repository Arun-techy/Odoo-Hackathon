/* =========================================================
   DAYFLOW — pagetransitions.js
   Loaded on every page. Two things:
   1) A thin top "route loader" bar that sweeps in as soon as
      the script runs, and finishes/fades once the page has
      loaded — so navigation always feels acknowledged.
   2) Internal same-page navigation (nav links, quick-cards,
      "sign in instead" links, etc.) fades the page out before
      actually changing location, instead of the usual hard
      jump-cut of a static multi-page site.
   Respects prefers-reduced-motion by skipping the animated
   parts and just navigating normally.
   ========================================================= */

(function () {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Top loading bar ---- */
  const loader = document.createElement('div');
  loader.className = 'route-loader';
  document.documentElement.appendChild(loader);

  if (!REDUCED) {
    requestAnimationFrame(() => loader.classList.add('running'));
  }

  function finishLoader() {
    loader.classList.remove('running');
    loader.classList.add('done');
    setTimeout(() => loader.remove(), 400);
  }

  if (document.readyState === 'complete') {
    finishLoader();
  } else {
    window.addEventListener('load', finishLoader);
    // Safety net in case 'load' is delayed by slow third-party scripts
    setTimeout(finishLoader, 1800);
  }

  if (REDUCED) return; // no exit-transition, links behave natively

  /* ---- Fade-out-then-navigate for internal links & quick-cards ---- */
  const EXIT_MS = 260;

  function isInternalNav(href) {
    if (!href) return false;
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    if (/^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)) return false;
    return true;
  }

  function goTo(href) {
    document.body.classList.remove('page-enter');
    document.body.classList.add('page-exit');
    setTimeout(() => { window.location.href = href; }, EXIT_MS);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const hrefEl = e.target.closest('[data-href]');
    if (!hrefEl) return;
    const href = hrefEl.getAttribute('data-href');
    if (isInternalNav(href)) {
      e.preventDefault();
      goTo(href);
    }
  });

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    // data-href elements (quick-cards etc.)
    const hrefEl = e.target.closest('[data-href]');
    if (hrefEl) {
      const href = hrefEl.getAttribute('data-href');
      if (isInternalNav(href)) {
        e.preventDefault();
        goTo(href);
      }
      return;
    }

    // plain anchor links
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!isInternalNav(href)) return;

    e.preventDefault();
    goTo(href);
  });
})();
