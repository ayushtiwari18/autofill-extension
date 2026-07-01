/**
 * tooltip.js — SmartFill A7 (fix: click-before-dismiss race)
 *
 * BUG FIXED: Clicking the suggestion row closed the tooltip without
 * filling the value.
 *
 * Root cause: `onOutside` was on 'mousedown' with capture=true, so it
 * ran BEFORE the row's own mousedown handler, destroying the tooltip
 * before the 'click' event could fire.
 *
 * Fix: move outside-dismiss to 'click' in bubble phase. The row's
 * click handler calls accept() and hideTooltip() first; by the time
 * the document click listener runs, the tooltip is already gone and
 * the condition `!tip.contains(e.target)` is vacuously irrelevant.
 */

let _current   = null;   // { el, tooltipEl, cleanup }
let _hideTimer = null;

/**
 * Show a suggestion tooltip below `el`.
 * @param {HTMLElement}  el
 * @param {{ label: string, value: string }} suggestion
 * @param {Function}     onAccept  — called with (value) when user clicks
 */
export function showTooltip(el, suggestion, onAccept) {
  hideTooltip(); // dismiss any existing

  const tip = document.createElement('div');
  tip.className = 'sf-tooltip';
  tip.setAttribute('role', 'listbox');
  tip.setAttribute('aria-label', 'SmartFill suggestion');

  // — Main row
  const row = document.createElement('div');
  row.className = 'sf-tooltip-row';
  row.setAttribute('role', 'option');
  row.tabIndex  = 0;

  const icon = document.createElement('span');
  icon.className   = 'sf-tooltip-icon';
  icon.textContent = '💡';

  const labelEl = document.createElement('span');
  labelEl.className   = 'sf-tooltip-label';
  labelEl.textContent = suggestion.label;

  const valueEl = document.createElement('span');
  valueEl.className   = 'sf-tooltip-value';
  valueEl.textContent = suggestion.value;

  row.append(icon, labelEl, valueEl);

  // — Hint footer
  const hint = document.createElement('div');
  hint.className   = 'sf-tooltip-hint';
  hint.textContent = 'Click or ↵ to fill  ·  Esc to dismiss';

  tip.append(row, hint);
  document.body.appendChild(tip);

  _positionTooltip(tip, el);

  // ─── Accept handler ───────────────────────────────────────────────
  const accept = () => {
    onAccept(suggestion.value);
    hideTooltip();
  };

  // Click on the row → accept
  row.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent document click handler from also running
    accept();
  });

  // Keyboard: Enter / Space on focused row → accept
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      accept();
    }
  });

  // Cancel the blur-schedule timer when user mouses inside the tooltip
  // (do NOT preventDefault here — we moved outside-detect to 'click')
  tip.addEventListener('mousedown', () => {
    if (_hideTimer) {
      clearTimeout(_hideTimer);
      _hideTimer = null;
    }
  });

  // ─── Dismiss listeners ────────────────────────────────────────────
  const onKeyDown = (e) => {
    if (e.key === 'Escape') hideTooltip();
  };

  // Use 'click' (bubble phase, no capture) so the row's own click
  // handler runs first. If the click was inside the tooltip, the row
  // handler already called e.stopPropagation() so this never fires.
  const onOutside = (e) => {
    if (!tip.contains(e.target) && e.target !== el) hideTooltip();
  };

  const onScroll = () => _positionTooltip(tip, el);

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('click',   onOutside);        // bubble, no capture
  document.addEventListener('scroll',  onScroll,  true);
  window.addEventListener  ('resize',  onScroll);

  const cleanup = () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('click',   onOutside);
    document.removeEventListener('scroll',  onScroll,  true);
    window.removeEventListener  ('resize',  onScroll);
  };

  _current = { el, tooltipEl: tip, cleanup };
}

export function hideTooltip() {
  if (!_current) return;
  _current.cleanup();
  _current.tooltipEl.remove();
  _current = null;
}

export function scheduleHide(ms = 300) {
  if (_hideTimer) clearTimeout(_hideTimer);
  _hideTimer = setTimeout(() => {
    _hideTimer = null;
    hideTooltip();
  }, ms);
}

export function isTooltipVisible() {
  return _current !== null;
}

function _positionTooltip(tip, el) {
  const rect = el.getBoundingClientRect();
  const vw   = window.innerWidth;
  const vh   = window.innerHeight;

  let top  = rect.bottom + 4;
  let left = rect.left;

  // Clamp right edge
  const tipW = tip.offsetWidth || 220;
  if (left + tipW > vw - 8) left = vw - tipW - 8;
  if (left < 8) left = 8;

  // Flip above if not enough space below
  if (top + 80 > vh && rect.top > 80) {
    top = rect.top - (tip.offsetHeight || 72) - 4;
  }

  tip.style.top  = `${Math.round(top)}px`;
  tip.style.left = `${Math.round(left)}px`;
}
