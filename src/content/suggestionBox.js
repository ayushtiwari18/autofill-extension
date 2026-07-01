/**
 * suggestionBox.js
 * ────────────────
 * Renders a ranked multi-suggestion card anchored to a form field.
 *
 * FIX: positionBox() is now called entirely inside requestAnimationFrame
 * so that offsetHeight is measured after the box is painted — the
 * above/below decision is now always correct.
 */

const TAG = '[SuggestionBox]';

let _box        = null;
let _anchor     = null;
let _onChoose   = null;
let _hovered    = false;
let _activeIdx  = 0;
let _items      = [];

const STYLES = `
  .sf-suggestion-box {
    position: fixed;
    z-index: 2147483647;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.08);
    min-width: 240px;
    max-width: 380px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    transition: opacity 0.12s ease, transform 0.12s ease;
    opacity: 0;
    transform: translateY(-4px);
    pointer-events: none;
  }
  .sf-suggestion-box.sf-visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: all;
  }
  .sf-suggestion-box.sf-above {
    transform: translateY(4px);
  }
  .sf-suggestion-box.sf-above.sf-visible {
    transform: translateY(0);
  }
  .sf-suggestion-header {
    padding: 6px 10px 4px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #999;
    border-bottom: 1px solid #f0f0f0;
  }
  .sf-suggestion-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid #f8f8f8;
    transition: background 0.08s;
  }
  .sf-suggestion-item:last-child { border-bottom: none; }
  .sf-suggestion-item:hover,
  .sf-suggestion-item.sf-active { background: #f0f7ff; }
  .sf-suggestion-value {
    flex: 1;
    font-size: 13px;
    color: #1a1a1a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }
  .sf-suggestion-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 20px;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .sf-badge-memory  { background: #e8f5e9; color: #2e7d32; }
  .sf-badge-profile { background: #e3f2fd; color: #1565c0; }
  .sf-suggestion-count   { font-size: 11px; color: #aaa; flex-shrink: 0; }
  .sf-suggestion-recency { font-size: 10px; color: #bbb; flex-shrink: 0; }
  .sf-suggestion-footer {
    padding: 4px 10px 5px;
    font-size: 10px;
    color: #bbb;
    border-top: 1px solid #f0f0f0;
    display: flex;
    gap: 10px;
  }
  .sf-suggestion-footer kbd {
    background: #f0f0f0;
    border-radius: 3px;
    padding: 0 4px;
    font-size: 10px;
    font-family: inherit;
    color: #555;
  }
`;

let _stylesInjected = false;
function injectStyles() {
  if (_stylesInjected) return;
  const style = document.createElement('style');
  style.id = 'sf-suggestion-box-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
  _stylesInjected = true;
}

function formatRecency(lastUsed) {
  if (!lastUsed) return '';
  const mins = Math.floor((Date.now() - lastUsed) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function buildBox(suggestions) {
  const box = document.createElement('div');
  box.className = 'sf-suggestion-box';
  box.setAttribute('role', 'listbox');
  box.setAttribute('aria-label', 'SmartFill suggestions');

  const header = document.createElement('div');
  header.className = 'sf-suggestion-header';
  header.textContent = 'SmartFill Suggestions';
  box.appendChild(header);

  suggestions.forEach((s, idx) => {
    const item = document.createElement('div');
    item.className = 'sf-suggestion-item' + (idx === 0 ? ' sf-active' : '');
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
    item.dataset.idx = idx;

    const valueEl = document.createElement('span');
    valueEl.className = 'sf-suggestion-value';
    valueEl.textContent = s.value;

    const badge = document.createElement('span');
    badge.className = `sf-suggestion-badge sf-badge-${s.source}`;
    badge.textContent = s.source === 'memory' ? 'memory' : 'profile';

    item.appendChild(valueEl);
    item.appendChild(badge);

    if (s.source === 'memory' && s.usedCount > 0) {
      const countEl = document.createElement('span');
      countEl.className = 'sf-suggestion-count';
      countEl.textContent = `${s.usedCount}×`;
      item.appendChild(countEl);
    }
    if (s.lastUsed) {
      const recencyEl = document.createElement('span');
      recencyEl.className = 'sf-suggestion-recency';
      recencyEl.textContent = formatRecency(s.lastUsed);
      item.appendChild(recencyEl);
    }

    item.addEventListener('mousedown', (e) => { e.preventDefault(); choose(s.value); });
    item.addEventListener('mouseenter', () => setActive(idx));
    box.appendChild(item);
  });

  const footer = document.createElement('div');
  footer.className = 'sf-suggestion-footer';
  footer.innerHTML = '<kbd>↑↓</kbd> navigate &nbsp; <kbd>↵</kbd> fill &nbsp; <kbd>Esc</kbd> dismiss';
  box.appendChild(footer);

  box.addEventListener('mouseenter', () => { _hovered = true; });
  box.addEventListener('mouseleave', () => {
    _hovered = false;
    setTimeout(() => { if (!_hovered) SuggestionBox.hide(); }, 150);
  });

  return box;
}

/**
 * FIX: positionBox now receives the real painted height via offsetHeight
 * because it is always called inside requestAnimationFrame after the box
 * is appended to the DOM and sf-visible has been added.
 */
function positionBox(box, anchorEl) {
  const rect       = anchorEl.getBoundingClientRect();
  const boxH       = box.offsetHeight;   // accurate — called after paint
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const openAbove  = spaceBelow < boxH + 8 && spaceAbove > spaceBelow;

  if (openAbove) {
    box.classList.add('sf-above');
    box.style.top = `${rect.top - boxH - 4}px`;
  } else {
    box.classList.remove('sf-above');
    box.style.top = `${rect.bottom + 4}px`;
  }

  let left = rect.left;
  const boxW = 280;
  if (left + boxW > window.innerWidth - 8) left = window.innerWidth - boxW - 8;
  box.style.left  = `${left}px`;
  box.style.width = `${Math.min(Math.max(rect.width, 240), 380)}px`;
}

function setActive(idx) {
  if (!_box) return;
  _box.querySelectorAll('.sf-suggestion-item').forEach((item, i) => {
    const isActive = i === idx;
    item.classList.toggle('sf-active', isActive);
    item.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  _activeIdx = idx;
}

function choose(value) {
  if (typeof _onChoose === 'function') _onChoose(value);
  SuggestionBox.hide();
}

function onKeyDown(e) {
  if (!_box || !_box.classList.contains('sf-visible')) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(_activeIdx + 1, _items.length - 1)); }
  else if (e.key === 'ArrowUp')  { e.preventDefault(); setActive(Math.max(_activeIdx - 1, 0)); }
  else if (e.key === 'Enter')    { e.preventDefault(); const c = _items[_activeIdx]; if (c) choose(c.value); }
  else if (e.key === 'Escape')   { SuggestionBox.hide(); }
  else if (e.key === 'Tab')      { const top = _items[0]; if (top) choose(top.value); }
}

export const SuggestionBox = {
  showFor(anchorEl, suggestions, onChoose) {
    injectStyles();
    this.hide(true);

    if (!suggestions || suggestions.length === 0) return;

    _items     = suggestions;
    _anchor    = anchorEl;
    _onChoose  = onChoose;
    _hovered   = false;
    _activeIdx = 0;

    _box = buildBox(suggestions);
    document.body.appendChild(_box);

    // FIX: show first, then position — so offsetHeight is the real painted value
    requestAnimationFrame(() => {
      if (!_box) return;
      _box.classList.add('sf-visible');
      positionBox(_box, anchorEl);
    });

    document.addEventListener('keydown', onKeyDown, true);
  },

  hide(immediate = false) {
    if (!_box) return;
    document.removeEventListener('keydown', onKeyDown, true);
    if (immediate) {
      _box.remove();
    } else {
      _box.classList.remove('sf-visible');
      const el = _box;
      setTimeout(() => { if (el.parentNode) el.remove(); }, 150);
    }
    _box = null; _anchor = null; _onChoose = null;
    _items = []; _hovered = false; _activeIdx = 0;
  },

  isHovered()  { return _hovered; },
  isVisible()  { return _box !== null && _box.classList.contains('sf-visible'); },
};

export default SuggestionBox;
