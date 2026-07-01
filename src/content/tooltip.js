/**
 * tooltip.js — SmartFill A6 (patched)
 * Renders a suggestion chip below a focused field.
 *
 * Usage:
 *   import { showTooltip, hideTooltip } from './tooltip.js';
 *   showTooltip(el, { label: 'email', value: 'a@b.com' }, onAccept);
 */

let _current = null;  // { el, tooltipEl, cleanup }
let _hideTimer = null;

/**
 * Show a suggestion tooltip below `el`.
 * @param {HTMLElement}  el        — the input field
 * @param {{ label: string, value: string }} suggestion
 * @param {Function}     onAccept  — called with (value) when user clicks
 */
export function showTooltip(el, suggestion, onAccept) {
  hideTooltip();  // dismiss any existing

  const tip = document.createElement('div');
  tip.className   = 'sf-tooltip';
  tip.setAttribute('role', 'listbox');
  tip.setAttribute('aria-label', 'SmartFill suggestion');

  // — Main row
  const row = document.createElement('div');
  row.className   = 'sf-tooltip-row';
  row.setAttribute('role', 'option');
  row.tabIndex    = 0;

  const icon = document.createElement('span');
  icon.className  = 'sf-tooltip-icon';
  icon.textContent = '💡';

  const labelEl = document.createElement('span');
  labelEl.className  = 'sf-tooltip-label';
  labelEl.textContent = suggestion.label;

  const valueEl = document.createElement('span');
  valueEl.className  = 'sf-tooltip-value';
  valueEl.textContent = suggestion.value;

  row.append(icon, labelEl, valueEl);

  // — Hint footer
  const hint = document.createElement('div');
  hint.className  = 'sf-tooltip-hint';
  hint.textContent = 'Click or ↵ to fill  ·  Esc to dismiss';

  tip.append(row, hint);
  document.body.appendChild(tip);

  _positionTooltip(tip, el);

  // — Accept handlers
  const accept = () => { onAccept(suggestion.value); hideTooltip(); };

  row.addEventListener('click', accept);
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); accept(); }
  });

  // Cancel the blur-triggered hide timer when user mousedowns inside tooltip
  tip.addEventListener('mousedown', (e) => {
    e.preventDefault();   // prevents input from losing focus prematurely
    if (_hideTimer) {
      clearTimeout(_hideTimer);
      _hideTimer = null;
    }
  });

  // — Dismiss on Esc or outside click
  const onKeyDown = (e) => { if (e.key === 'Escape') hideTooltip(); };
  const onOutside = (e) => {
    if (!tip.contains(e.target) && e.target !== el) hideTooltip();
  };
  const onScroll  = () => _positionTooltip(tip, el);

  document.addEventListener('keydown',  onKeyDown,  true);
  document.addEventListener('mousedown', onOutside, true);
  document.addEventListener('scroll',   onScroll,  true);
  window.addEventListener  ('resize',   onScroll);

  const cleanup = () => {
    document.removeEventListener('keydown',   onKeyDown,  true);
    document.removeEventListener('mousedown', onOutside,  true);
    document.removeEventListener('scroll',    onScroll,   true);
    window.removeEventListener  ('resize',    onScroll);
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
