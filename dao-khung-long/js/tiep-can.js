/* Focus follows visible dialogs and screens, including the host of embedded games. */
(function () {
  'use strict';
  let current = null, returnTo = null, changed = [], screen = null;
  const controls = 'button, a[href], input, select, textarea, iframe, [tabindex]';
  function visible(el) { return el && el.isConnected && el.getClientRects().length && !el.closest('.hidden'); }
  function buttons(root) {
    return Array.from(root.querySelectorAll(controls)).filter(function (el) { return visible(el) && !el.disabled && el.tabIndex >= 0 && !el.closest('[inert]'); });
  }
  function focus(root) {
    const list = buttons(root);
    if (list.length) list[0].focus();
    else { root.tabIndex = -1; root.focus(); }
  }
  function release() { changed.forEach(function (entry) { entry.el.inert = entry.was; }); changed = []; }
  function update() {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(visible);
    const next = dialogs[dialogs.length - 1] || null;
    if (next === current) {
      const activeScreen = Array.from(document.querySelectorAll('.man')).find(visible);
      if (!current && activeScreen !== screen && activeScreen) {
        screen = activeScreen;
        if (!visible(document.activeElement) || document.activeElement === document.body) focus(screen);
      }
      return;
    }
    const previous = current;
    release(); current = next;
    if (next) {
      if (!previous) returnTo = document.activeElement;
      next.setAttribute('aria-modal', 'true');
      let child = next;
      while (child.parentElement) {
        Array.from(child.parentElement.children).forEach(function (sibling) {
          if (sibling !== child && !/^(SCRIPT|STYLE|LINK)$/.test(sibling.tagName)) {
            changed.push({ el: sibling, was: sibling.inert }); sibling.inert = true;
          }
        });
        child = child.parentElement;
        if (child === document.body) break;
      }
      if (!next.contains(document.activeElement)) focus(next);
    } else if (previous) {
      if (visible(returnTo) && !returnTo.disabled && !returnTo.closest('[inert]')) returnTo.focus();
      else { const screen = Array.from(document.querySelectorAll('.man')).find(visible); if (screen) focus(screen); }
      returnTo = null;
    }
  }
  document.addEventListener('keydown', function (event) {
    if (!current || event.key !== 'Tab') return;
    const list = buttons(current);
    if (!list.length) { event.preventDefault(); focus(current); return; }
    const first = list[0], last = list[list.length - 1];
    if (event.shiftKey && (document.activeElement === first || !current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  }, true);
  document.addEventListener('focusin', function (event) { if (current && !current.contains(event.target)) focus(current); });
  new MutationObserver(update).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.TiepCan = {
    sao: function (el, earned) {
      const n = Math.max(0, Math.min(3, Math.round(Number(earned) || 0)));
      el.setAttribute('role', 'img'); el.setAttribute('aria-label', n + ' trên 3 sao');
      el.innerHTML = [0, 1, 2].map(function (i) { return '<i aria-hidden="true" class="' + (i < n ? 'co' : '') + '" style="--tre:' + (i * 0.25) + 's">★</i>'; }).join('');
    }
  };
})();
