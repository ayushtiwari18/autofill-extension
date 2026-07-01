/**
 * tooltip.js — SmartFill Shadow DOM Tooltip (B1 upgrade)
 *
 * UPGRADE: Migrated from regular DOM injection to Shadow DOM.
 *
 * Why Shadow DOM?
 *   Host pages often use aggressive CSS resets or !important rules that
 *   would override the tooltip's styling (wrong font, wrong color, broken
 *   layout). A Shadow DOM host creates a hard CSS boundary — no host-page
 *   stylesheet can reach inside the shadow root.
 *
 * Architecture:
 *   ONE persistent <div id="smartfill-tooltip-host"> is created on first
 *   use and appended to document.body. A shadow root is attached once.
 *   All subsequent calls reuse the same host, repositioning it.
 *
 * API (unchanged from previous version — autofiller.js needs zero changes):
 *   showTooltip(el, { label, value, icon? }, onAccept)
 *   hideTooltip()
 *   scheduleHide(ms)
 *   isTooltipVisible() → bool
 */

// ── Shadow DOM host (created once, reused) ────────────────────────────────
let _host   = null;
let _shadow = null;

function ensureHost() {
  if (_host) return;

  _host = document.createElement('div');
  _host.id = 'smartfill-tooltip-host';

  // Position the host absolutely via inline style (outside Shadow DOM so
  // the host element itself can be placed on the page)
  Object.assign(_host.style, {
    position:  'absolute',
    zIndex:    '2147483647',
    top:       '0',
    left:      '0',
    pointerEvents: 'none',   // host itself is click-through; shadow content overrides
  });

  _shadow = _host.attachShadow({ mode: 'open' });

  // All CSS is scoped inside the shadow root — zero leakage to/from host page
  _shadow.innerHTML = `
    <style>
      :host {
        all: initial;
        display: block;
        position: absolute;
        z-index: 2147483647;
        pointer-events: none;
      }
      .sf-tooltip {
        pointer-events: auto;
        background: #1e1e2e;
        color: #cdd6f4;
        border-radius: 8px;
        padding: 0;
        min-width: 220px;
        max-width: 340px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        box-shadow: 0 4px 20px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.08);
        overflow: hidden;
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 140ms ease, transform 140ms ease;
      }
      .sf-tooltip.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .sf-tooltip-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px 8px;
        cursor: pointer;
        border-radius: 0;
        transition: background 120ms ease;
      }
      .sf-tooltip-row:hover,
      .sf-tooltip-row:focus {
        background: rgba(255,255,255,0.07);
        outline: none;
      }
      .sf-tooltip-row:active {
        background: rgba(255,255,255,0.13);
      }
      .sf-tooltip-icon {
        font-size: 15px;
        flex-shrink: 0;
        line-height: 1;
      }
      .sf-tooltip-label {
        color: #a6adc8;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.3px;
        text-transform: uppercase;
        flex-shrink: 0;
      }
      .sf-tooltip-value {
        color: #cdd6f4;
        font-size: 13px;
        font-weight: 600;
        margin-left: auto;
        text-align: right;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 160px;
      }
      .sf-tooltip-hint {
        font-size: 10px;
        color: #585b70;
        padding: 4px 12px 8px;
        border-top: 1px solid rgba(255,255,255,0.05);
        user-select: none;
      }
    </style>
    <div class="sf-tooltip" role="listbox" aria-label="SmartFill suggestion">
      <div class="sf-tooltip-row" role="option" tabindex="0">
        <span class="sf-tooltip-icon">💡</span>
        <span class="sf-tooltip-label"></span>
        <span class="sf-tooltip-value"></span>
      </div>
      <div class="sf-tooltip-hint">Click or ↵ to fill · Esc to dismiss</div>
    </div>
  `;

  document.body.appendChild(_host);
}

// ── State ─────────────────────────────────────────────────────────────────
let _current   = null;   // { el, cleanup }
let _hideTimer = null;

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Show a suggestion tooltip below `el`.
 *
 * @param {HTMLElement}  el
 * @param {{ label: string, value: string, icon?: string }} suggestion
 * @param {Function}     onAccept  — called with (value) when user accepts
 */
export function showTooltip(el, suggestion, onAccept) {
  hideTooltip();
  ensureHost();

  const tip  = _shadow.querySelector('.sf-tooltip');
  const row  = _shadow.querySelector('.sf-tooltip-row');
  const icon = _shadow.querySelector('.sf-tooltip-icon');
  const lbl  = _shadow.querySelector('.sf-tooltip-label');
  const val  = _shadow.querySelector('.sf-tooltip-value');

  icon.textContent = suggestion.icon  || '💡';
  lbl.textContent  = suggestion.label || '';
  val.textContent  = suggestion.value || '';

  // Position before showing so there's no layout flash
  _positionTooltip(el);

  // Trigger enter animation
  tip.classList.remove('visible');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => tip.classList.add('visible'));
  });

  // ── Accept handler ──────────────────────────────────────────────────
  const accept = () => {
    onAccept(suggestion.value);
    hideTooltip();
  };

  row.addEventListener('click', (e) => {
    e.stopPropagation();
    accept();
  }, { once: true });

  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      accept();
    }
  }, { once: true });

  // Cancel scheduled hide when user moves into the tooltip
  tip.addEventListener('mouseenter', () => {
    if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
  });

  // ── Dismiss listeners ───────────────────────────────────────────────
  const onKeyDown = (e) => { if (e.key === 'Escape') hideTooltip(); };
  const onOutside = (e) => {
    // Clicks inside the shadow root don't bubble to document in all browsers;
    // this guard is an extra safety net.
    if (e.target !== el && !_host.contains(e.target)) hideTooltip();
  };
  const onScroll = () => _positionTooltip(el);

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('click',   onOutside);
  document.addEventListener('scroll',  onScroll,  true);
  window.addEventListener  ('resize',  onScroll);

  const cleanup = () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('click',   onOutside);
    document.removeEventListener('scroll',  onScroll,  true);
    window.removeEventListener  ('resize',  onScroll);
    tip.classList.remove('visible');
  };

  _current = { el, cleanup };
  row.focus();
}

export function hideTooltip() {
  if (!_current) return;
  _current.cleanup();
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

function _positionTooltip(el) {
  const rect  = el.getBoundingClientRect();
  const vw    = window.innerWidth;
  const vh    = window.innerHeight;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  let top  = rect.bottom + scrollY + 4;
  let left = rect.left   + scrollX;

  // Ensure host is visible so we can measure it
  _host.style.visibility = 'hidden';
  _host.style.top  = `${top}px`;
  _host.style.left = `${left}px`;

  const tipW = _host.offsetWidth  || 220;
  const tipH = _host.offsetHeight || 72;

  // Clamp right edge
  if (left + tipW > vw + scrollX - 8) left = vw + scrollX - tipW - 8;
  if (left < scrollX + 8) left = scrollX + 8;

  // Flip above if not enough space below
  if (rect.bottom + 4 + tipH > vh && rect.top > tipH + 4) {
    top = rect.top + scrollY - tipH - 4;
  }

  _host.style.top        = `${Math.round(top)}px`;
  _host.style.left       = `${Math.round(left)}px`;
  _host.style.visibility = 'visible';
}
