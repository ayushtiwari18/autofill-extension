/**
 * Adapter Registry
 * Automatically selects the right adapter based on the current URL.
 * Adapters provide site-specific field selector hints to boost matching accuracy.
 */

import { LinkedInAdapter } from './LinkedInAdapter.js';
import { WorkdayAdapter } from './WorkdayAdapter.js';
import { GenericAdapter } from './GenericAdapter.js';

// All registered adapters, in priority order
const ADAPTERS = [
  LinkedInAdapter,
  WorkdayAdapter,
  GenericAdapter  // must be last — catches everything
];

/**
 * Get the best adapter for a given URL
 * @param {string} url - Current page URL
 * @returns {Object} - Adapter instance
 */
export function getAdapterForURL(url) {
  if (!url) return GenericAdapter;

  for (const adapter of ADAPTERS) {
    if (adapter.matches(url)) {
      console.log(`[AdapterRegistry] Using adapter: ${adapter.name} for ${url}`);
      return adapter;
    }
  }

  return GenericAdapter;
}

/**
 * Enhance form field metadata using the appropriate adapter
 * @param {Object} formField - Raw field metadata from scanner
 * @param {string} url - Current page URL
 * @returns {Object} - Enhanced field metadata
 */
export function enhanceFieldWithAdapter(formField, url) {
  const adapter = getAdapterForURL(url);
  return adapter.enhanceField(formField);
}

export { LinkedInAdapter, WorkdayAdapter, GenericAdapter };
