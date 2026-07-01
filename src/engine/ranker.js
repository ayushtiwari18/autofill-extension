/**
 * ranker.js — Frequency × Recency Decay Scoring
 * ───────────────────────────────────────────────
 * Pure utility. Zero DOM. Zero IDB.
 *
 * Exports:
 *   scoreEntry(entry)          → number   (composite score 0–∞)
 *   rankSuggestions(entries)   → entries[] sorted descending by score
 *
 * Score formula:
 *   score = usedCount × exp(−daysSinceLastUsed / DECAY_DAYS)
 *
 * Intuition:
 *   - A value used 10× a week ago scores higher than one used 3× today
 *     only if 10 × decay(7) > 3 × decay(0)  →  10×0.79 > 3×1.0  →  7.9 > 3  ✅
 *   - A value used 1× 60 days ago nearly vanishes: 1 × exp(−2) ≈ 0.14
 *   - DECAY_DAYS = 30 means half-life ≈ 21 days
 */

/** Number of days for the exponential decay half-life-ish constant. */
const DECAY_DAYS = 30;

/**
 * Compute the composite score for a single suggestion entry.
 *
 * @param {{ value: string, usedCount: number, lastUsed: number|null }} entry
 *   - usedCount : how many times this value was confirmed-filled
 *   - lastUsed  : timestamp in ms (Date.now()), or null if never recorded
 * @returns {number} score ≥ 0 (higher = better)
 */
export function scoreEntry(entry) {
  const count = typeof entry.usedCount === 'number' ? entry.usedCount : 0;
  if (count === 0) return 0;

  // If lastUsed is missing / null, treat as 365 days ago (heavily decayed)
  const lastUsedMs  = entry.lastUsed ?? (Date.now() - 365 * 86_400_000);
  const daysSince   = (Date.now() - lastUsedMs) / 86_400_000;
  const recency     = Math.exp(-Math.max(0, daysSince) / DECAY_DAYS);

  return count * recency;
}

/**
 * Sort an array of suggestion entries by score, highest first.
 * Does NOT mutate the original array.
 *
 * @param {Array<{ value: string, usedCount: number, lastUsed: number|null }>} entries
 * @returns {Array} new sorted array with a `score` field added to each entry
 */
export function rankSuggestions(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return [];

  return entries
    .map(e => ({ ...e, score: scoreEntry(e) }))
    .sort((a, b) => b.score - a.score);
}
