/**
 * suggestionBox.js
 * ────────────────
 * Renders a ranked multi-suggestion card anchored to a form field.
 *
 * Replaces the old single-value tooltip with a full dropdown card:
 *  ┌──────────────────────────────────────┐
 *  │ 🕐 Ayush Tiwari          memory  3×  │  ← top suggestion, highlighted
 *  │    A. Tiwari             memory  1×  │
 *  │    Ayush                 profile     │  ← fallback from profile
 *  └──────────────────────────────────────┘
 *
 * Features:
 *  - Keyboard nav: ↑↓ to move selection, Enter to fill, Esc to dismiss
 *  - Click any row to fill immediately
 *  - Auto-dismiss when mouse leaves both field AND box (with 150ms grace)
 *  - Source badge: 'memory' (IDB) or 'profile' (static profile value)
 *  - Recency badge shows relative time for memory entries
 *  - Viewport-aware positioning: opens below by default, flips above near bottom
 *  - Only one box shown at a time (singleton)
 *
 * Usage (via hoverListener.js — do not call directly from autofiller):
 *   SuggestionBox.showFor(el, suggestions, onChoose);
 *   SuggestionBox.hide();
 *   SuggestionBox.isHovered();
 */

const TAG = '[SuggestionBox]';

// ─── Singleton state ─────────────────────────────────────────────────────────

let _box        = null;   // The DOM element for the card
let _anchor     = null;   // The field element the box is anchored to
let _onChoose   = null;   // Callback when user picks a value
let _hovered    = false;  // Is mouse currently inside the box?
let _activeIdx  = 0;      // Currently highlighted row index
let _items      = [];     // Current suggestion list
let _fillFn     = null;   // Function to actually fill the field

// ─── Styles injected once into the document ──────────────────────────────────

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
  .sf-suggestion-item:last-child {
    border-bottom: none;
  }
  .sf-suggestion-item:hover,
  .sf-suggestion-item.sf-active {
    background: #f0f7ff;
  }
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
  .sf-badge-memory {
    background: #e8f5e9;
    color: #2e7d32;
  }
  .sf-badge-profile {
    background: #e3f2fd;
    color: #1565c0;
  }
  .sf-suggestion-count {
    font-size: 11px;
    color: #aaa;
    flex-shrink: 0;
  }
  .sf-suggestion-recency {
    font-size: 10px;
    color: #bbb;
    flex-shrink: 0;
  }
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
  console.log(`${TAG} styles injected`);
}

// ─── Time formatting helper ───────────────────────────────────────────────────

function formatRecency(lastUsed) {
  if (!lastUsed) return '';
  const mins  = Math.floor((Date.now() - lastUsed) / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Build the box DOM ────────────────────────────────────────────────────────

function buildBox(suggestions) {
  console.log(`${TAG} buildBox → ${suggestions.length} suggestion(s)`);

  const box = document.createElement('div');
  box.className = 'sf-suggestion-box';
  box.setAttribute('role', 'listbox');
  box.setAttribute('aria-label', 'SmartFill suggestions');

  // Header
  const header = document.createElement('div');
  header.className = 'sf-suggestion-header';
  header.textContent = 'SmartFill Suggestions';
  box.appendChild(header);

  // Rows
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

    // Click handler
    item.addEventListener('mousedown', (e) => {
      // Use mousedown so it fires before blur on the field
      e.preventDefault();
      console.log(`${TAG} click → chose "${s.value}" (idx=${idx})`);
      choose(s.value);
    });

    // Hover highlight
    item.addEventListener('mouseenter', () => {
      setActive(idx);
    });

    box.appendChild(item);
  });

  // Footer (keyboard hints)
  const footer = document.createElement('div');
  footer.className = 'sf-suggestion-footer';
  footer.innerHTML = '<kbd>↑↓</kbd> navigate &nbsp; <kbd>↵</kbd> fill &nbsp; <kbd>Esc</kbd> dismiss';
  box.appendChild(footer);

  // Box hover tracking
  box.addEventListener('mouseenter', () => {
    _hovered = true;
    console.log(`${TAG} box mouseenter — isHovered=true`);
  });
  box.addEventListener('mouseleave', () => {
    _hovered = false;
    console.log(`${TAG} box mouseleave — isHovered=false`);
    // If field is also not hovered, hide after short grace
    setTimeout(() => {
      if (!_hovered) {
        console.log(`${TAG} box mouseleave grace elapsed — hiding`);
        SuggestionBox.hide();
      }
    }, 150);
  });

  return box;
}

// ─── Positioning ──────────────────────────────────────────────────────────────

function positionBox(box, anchorEl) {
  const rect    = anchorEl.getBoundingClientRect();
  const boxH    = box.offsetHeight || 200; // estimate before paint
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  const openAbove = spaceBelow < boxH + 8 && spaceAbove > spaceBelow;

  if (openAbove) {
    box.classList.add('sf-above');
    box.style.top  = `${rect.top - boxH - 4}px`;
    console.log(`${TAG} positioned ABOVE anchor (spaceBelow=${spaceBelow.toFixed(0)}px)`);
  } else {
    box.classList.remove('sf-above');
    box.style.top  = `${rect.bottom + 4}px`;
    console.log(`${TAG} positioned BELOW anchor (spaceBelow=${spaceBelow.toFixed(0)}px)`);
  }

  // Align left edge, but don't overflow right
  let left = rect.left;
  const boxW = 280;
  if (left + boxW > window.innerWidth - 8) {
    left = window.innerWidth - boxW - 8;
  }
  box.style.left  = `${left}px`;
  box.style.width = `${Math.min(Math.max(rect.width, 240), 380)}px`;
}

// ─── Active row management ────────────────────────────────────────────────────

function setActive(idx) {
  if (!_box) return;
  const items = _box.querySelectorAll('.sf-suggestion-item');
  items.forEach((item, i) => {
    const isActive = i === idx;
    item.classList.toggle('sf-active', isActive);
    item.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  _activeIdx = idx;
}

// ─── Choose & fill ────────────────────────────────────────────────────────────

function choose(value) {
  console.log(`${TAG} choose → "${value}"`);
  if (typeof _onChoose === 'function') {
    _onChoose(value);
  }
  SuggestionBox.hide();
}

// ─── Keyboard handler (attached to document while box is visible) ─────────────

function onKeyDown(e) {
  if (!_box || !_box.classList.contains('sf-visible')) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = Math.min(_activeIdx + 1, _items.length - 1);
    console.log(`${TAG} ArrowDown → idx ${_activeIdx} → ${next}`);
    setActive(next);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = Math.max(_activeIdx - 1, 0);
    console.log(`${TAG} ArrowUp → idx ${_activeIdx} → ${prev}`);
    setActive(prev);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const chosen = _items[_activeIdx];
    if (chosen) {
      console.log(`${TAG} Enter → chose "${chosen.value}" (idx=${_activeIdx})`);
      choose(chosen.value);
    }
  } else if (e.key === 'Escape') {
    console.log(`${TAG} Escape → hiding box`);
    SuggestionBox.hide();
  } else if (e.key === 'Tab') {
    // Tab fills with top suggestion and continues to next field
    const top = _items[0];
    if (top) {
      console.log(`${TAG} Tab → auto-choosing top suggestion "${top.value}"`);
      choose(top.value);
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const SuggestionBox = {
  /**
   * Show the suggestion box anchored to a field element.
   *
   * @param {HTMLElement} anchorEl   — the field being hovered
   * @param {Array}       suggestions — ranked list from getTopSuggestions()
   * @param {Function}    onChoose   — called with the chosen value string
   */
  showFor(anchorEl, suggestions, onChoose) {
    console.log(`${TAG} showFor → anchor=${anchorEl.tagName} suggestions=${suggestions.length}`);

    injectStyles();

    // Tear down previous box if any
    this.hide(true);

    if (!suggestions || suggestions.length === 0) {
      console.log(`${TAG} showFor → no suggestions, aborting`);
      return;
    }

    _items    = suggestions;
    _anchor   = anchorEl;
    _onChoose = onChoose;
    _hovered  = false;
    _activeIdx = 0;

    _box = buildBox(suggestions);
    document.body.appendChild(_box);
    console.log(`${TAG} box appended to DOM`);

    // Position before showing (so we can measure)
    positionBox(_box, anchorEl);

    // Trigger visible on next frame (for CSS transition)
    requestAnimationFrame(() => {
      if (_box) {
        _box.classList.add('sf-visible');
        // Re-position after paint (now we have real height)
        positionBox(_box, anchorEl);
        console.log(`${TAG} box is now visible`);
      }
    });

    // Keyboard handler
    document.addEventListener('keydown', onKeyDown, true);
  },

  /**
   * Hide and destroy the current suggestion box.
   * @param {boolean} [immediate=false] — skip transition
   */
  hide(immediate = false) {
    if (!_box) return;
    console.log(`${TAG} hide → immediate=${immediate}`);

    document.removeEventListener('keydown', onKeyDown, true);

    if (immediate) {
      _box.remove();
    } else {
      _box.classList.remove('sf-visible');
      const el = _box;
      setTimeout(() => {
        if (el.parentNode) el.remove();
        console.log(`${TAG} box removed from DOM`);
      }, 150);
    }

    _box      = null;
    _anchor   = null;
    _onChoose = null;
    _items    = [];
    _hovered  = false;
    _activeIdx = 0;
  },

  /**
   * Returns true if the mouse is currently inside the suggestion box.
   * Used by hoverListener.js to prevent premature hiding.
   * @returns {boolean}
   */
  isHovered() {
    return _hovered;
  },

  /**
   * Returns true if the box is currently visible.
   * @returns {boolean}
   */
  isVisible() {
    return _box !== null && _box.classList.contains('sf-visible');
  },
};

export default SuggestionBox;
