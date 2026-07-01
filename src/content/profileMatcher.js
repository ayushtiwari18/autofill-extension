/**
 * profileMatcher.js — SmartFill A5
 * ─────────────────────────────────────────────────────────
 * Maps a field fingerprint  (domain::label::type)
 * to a profile key, then resolves the value from the
 * profile stored in chrome.storage.sync.
 *
 * Profile schema (stored under key "smartfill_profile"):
 * {
 *   full_name:   "Ayush Tiwari",
 *   first_name:  "Ayush",
 *   last_name:   "Tiwari",
 *   email:       "ayushtiwari102003@gmail.com",
 *   phone:       "+91-XXXXXXXXXX",
 *   college:     "NIT Jamshedpur",
 *   degree:      "B.Tech CSE",
 *   grad_year:   "2025",
 *   city:        "Jamshedpur",
 *   state:       "Jharkhand",
 *   country:     "India",
 *   linkedin:    "https://linkedin.com/in/ayushtiwari18",
 *   github:      "https://github.com/ayushtiwari18",
 *   portfolio:   "",
 *   skills:      "JavaScript, React, Node.js, Python"
 * }
 */

// ───────────────────────────────────────────────────────────
// Label → profile-key mappings  (order = priority)
// ───────────────────────────────────────────────────────────

const LABEL_MAP = [
  // Full name
  { keys: ['full name', 'full_name', 'your name', 'name'],         profile: 'full_name'  },
  // First name
  { keys: ['first name', 'first_name', 'given name'],              profile: 'first_name' },
  // Last name
  { keys: ['last name', 'last_name', 'surname', 'family name'],    profile: 'last_name'  },
  // Email
  { keys: ['email', 'e-mail', 'email address', 'mail'],            profile: 'email'      },
  // Phone
  { keys: ['phone', 'mobile', 'contact', 'phone number',
           'mobile number', 'contact number'],                      profile: 'phone'      },
  // College / University
  { keys: ['college', 'university', 'institution', 'school',
           'college name', 'university name'],                      profile: 'college'    },
  // Degree
  { keys: ['degree', 'qualification', 'education',
           'highest qualification'],                                profile: 'degree'     },
  // Graduation year
  { keys: ['graduation year', 'grad year', 'passing year',
           'year of passing', 'year of graduation'],               profile: 'grad_year'  },
  // City
  { keys: ['city', 'town', 'current city', 'location'],            profile: 'city'       },
  // State
  { keys: ['state', 'province', 'region'],                         profile: 'state'      },
  // Country
  { keys: ['country', 'nation'],                                   profile: 'country'    },
  // LinkedIn
  { keys: ['linkedin', 'linkedin profile', 'linkedin url'],        profile: 'linkedin'   },
  // GitHub
  { keys: ['github', 'github profile', 'github url'],              profile: 'github'     },
  // Portfolio
  { keys: ['portfolio', 'portfolio url', 'website', 'personal url'], profile: 'portfolio' },
  // Skills
  { keys: ['skills', 'key skills', 'technical skills',
           'areas of expertise'],                                   profile: 'skills'     },
];

/**
 * Given a FieldInfo fingerprint label, return the matching
 * profile key or null.
 * @param {string} label  — normalised label from fieldScanner
 * @returns {string|null}
 */
export function labelToProfileKey(label) {
  const norm = label.trim().toLowerCase();
  for (const entry of LABEL_MAP) {
    if (entry.keys.some(k => norm.includes(k) || k.includes(norm))) {
      return entry.profile;
    }
  }
  return null;
}

/**
 * Load the user profile from chrome.storage.sync.
 * Falls back to an empty object if not set yet.
 * @returns {Promise<Object>}
 */
export async function loadProfile() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get('smartfill_profile', (result) => {
        resolve(result.smartfill_profile || {});
      });
    } catch {
      // Dev / test environment without chrome APIs
      resolve({});
    }
  });
}

/**
 * Match a FieldInfo to a profile value.
 * @param {import('./fieldScanner.js').FieldInfo} fieldInfo
 * @param {Object} profile
 * @returns {string|null}  — the value to fill, or null
 */
export function matchFieldToProfile(fieldInfo, profile) {
  const key = labelToProfileKey(fieldInfo.label);
  if (!key) return null;
  const val = profile[key];
  return (val !== undefined && val !== '') ? String(val) : null;
}
