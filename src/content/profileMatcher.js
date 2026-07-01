/**
 * profileMatcher.js — SmartFill A5 (patched)
 * Maps field fingerprint label → profile key → value.
 *
 * Profile stored in chrome.storage.local under key "profile".
 */

const LABEL_MAP = [
  { keys: ['full name', 'full_name', 'your name', 'name'],          profile: 'full_name'  },
  { keys: ['first name', 'first_name', 'given name'],               profile: 'first_name' },
  { keys: ['last name', 'last_name', 'surname', 'family name'],     profile: 'last_name'  },
  { keys: ['email', 'e-mail', 'email address', 'mail'],             profile: 'email'      },
  { keys: ['phone', 'mobile', 'contact', 'phone number',
           'mobile number', 'contact number'],                       profile: 'phone'      },
  { keys: ['college', 'university', 'institution', 'school',
           'college name', 'university name'],                       profile: 'college'    },
  { keys: ['degree', 'qualification', 'education',
           'highest qualification'],                                 profile: 'degree'     },
  { keys: ['graduation year', 'grad year', 'passing year',
           'year of passing', 'year of graduation'],                profile: 'grad_year'  },
  { keys: ['city', 'town', 'current city', 'location'],             profile: 'city'       },
  { keys: ['state', 'province', 'region'],                          profile: 'state'      },
  { keys: ['country', 'nation'],                                    profile: 'country'    },
  { keys: ['linkedin', 'linkedin profile', 'linkedin url'],         profile: 'linkedin'   },
  { keys: ['github', 'github profile', 'github url'],               profile: 'github'     },
  { keys: ['portfolio', 'portfolio url', 'website', 'personal url'], profile: 'portfolio' },
  { keys: ['skills', 'key skills', 'technical skills',
           'areas of expertise'],                                    profile: 'skills'     },
];

export function labelToProfileKey(label) {
  const norm = label.trim().toLowerCase();
  for (const entry of LABEL_MAP) {
    if (entry.keys.some(k => norm.includes(k) || k.includes(norm))) {
      return entry.profile;
    }
  }
  return null;
}

export async function loadProfile() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get('profile', (result) => {
        const p = result.profile || {};
        const keys = Object.keys(p);
        if (keys.length > 0) {
          console.log(`[Profile] loaded ${keys.length} key(s) from storage`);
        } else {
          console.warn('[Profile] storage is empty — seed via service worker console');
        }
        resolve(p);
      });
    } catch (e) {
      console.warn('[Profile] chrome.storage unavailable:', e.message);
      resolve({});
    }
  });
}

export function matchFieldToProfile(fieldInfo, profile) {
  const key = labelToProfileKey(fieldInfo.label);
  if (!key) return null;
  const val = profile[key];
  return (val !== undefined && val !== '') ? String(val) : null;
}
