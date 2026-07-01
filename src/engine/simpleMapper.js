/**
 * Simple Mapper — 5-field direct keyword match
 * No confidence scoring. No fieldTypes gate. No pattern arrays.
 * Just checks if label/name/placeholder contains a keyword.
 * Expand this file one field at a time once basics work.
 */

// ─── Profile value getter ───────────────────────────────────────────────────
function get(profile, ...keys) {
  let v = profile;
  for (const k of keys) {
    if (v == null || typeof v !== 'object') return '';
    v = v[k];
  }
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

// ─── Keyword rules ───────────────────────────────────────────────────────────
// Each rule: { keywords[], getValue(profile) }
// A field matches if ANY of its text sources (label, name, placeholder, id)
// CONTAINS one of the keywords (case-insensitive).
const RULES = [
  {
    profilePath: 'profile.personal.firstName',
    keywords: ['first name', 'firstname', 'fname', 'given name', 'first'],
    getValue: p => get(p, 'personal', 'firstName')
  },
  {
    profilePath: 'profile.personal.lastName',
    keywords: ['last name', 'lastname', 'lname', 'surname', 'family name', 'last'],
    getValue: p => get(p, 'personal', 'lastName')
  },
  {
    profilePath: 'profile.personal.email',
    keywords: ['email', 'e-mail', 'mail'],
    getValue: p => get(p, 'personal', 'email')
  },
  {
    profilePath: 'profile.personal.phone',
    keywords: ['phone', 'mobile', 'telephone', 'tel', 'cell', 'contact number'],
    getValue: p => get(p, 'personal', 'phone')
  },
  {
    profilePath: 'profile.links.linkedin',
    keywords: ['linkedin'],
    getValue: p => get(p, 'links', 'linkedin')
  },
  {
    profilePath: 'profile.links.github',
    keywords: ['github'],
    getValue: p => get(p, 'links', 'github')
  },
  {
    profilePath: 'profile.experience.skills',
    keywords: ['skill', 'expertise', 'competencies'],
    getValue: p => get(p, 'experience', 'skills')
  },
  {
    profilePath: 'profile.personal.city',
    keywords: ['city', 'town'],
    getValue: p => get(p, 'personal', 'city')
  },
  {
    profilePath: 'profile.education.university',
    keywords: ['university', 'college', 'school', 'institution'],
    getValue: p => get(p, 'education', 'university')
  },
  {
    profilePath: 'profile.experience.currentRole',
    keywords: ['current role', 'job title', 'position', 'role', 'title'],
    getValue: p => get(p, 'experience', 'currentRole')
  },
  {
    profilePath: 'profile.experience.currentCompany',
    keywords: ['company', 'employer', 'organization'],
    getValue: p => get(p, 'experience', 'currentCompany')
  }
];

function normalize(str) {
  return (str || '').toLowerCase().trim();
}

function fieldTextSources(field) {
  return [
    normalize(field.label),
    normalize(field.name),
    normalize(field.placeholder),
    normalize(field.id)
  ];
}

function matchField(field, innerProfile) {
  const sources = fieldTextSources(field);
  console.log(`[SimpleMapper] Field "${field.label || field.name}" sources:`, sources);

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      const kwNorm = normalize(kw);
      if (sources.some(src => src.includes(kwNorm))) {
        const value = rule.getValue(innerProfile);
        console.log(`  ✅ Keyword "${kw}" matched → ${rule.profilePath} = "${value}"`);
        if (!value) {
          console.warn(`  ⚠️ Profile value is empty for ${rule.profilePath} — skipping`);
          return null;
        }
        return {
          formFieldId: field.id,
          formFieldSelector: field.selector,
          formFieldLabel: field.label || field.placeholder || field.name,
          formFieldType: field.type,
          profilePath: rule.profilePath,
          profileValue: value,
          confidence: 0.95,
          matchedOn: 'keyword',
          requiresReview: false
        };
      }
    }
  }

  console.log(`  ❌ No keyword matched for field "${field.label || field.name}"`);
  return null;
}

export function simpleMapProfileToForm(innerProfile, formData) {
  console.log('[SimpleMapper] ─── Starting simple mapping ───');
  console.log('[SimpleMapper] Profile keys:', innerProfile ? Object.keys(innerProfile) : 'NULL');
  console.log('[SimpleMapper] Forms:', formData?.forms?.length ?? 0);

  const matches = [];
  const unmatchedFormFields = [];

  if (!innerProfile || !formData?.forms) {
    console.error('[SimpleMapper] Missing profile or formData');
    return { matches: [], unmatchedFormFields: [], overallConfidence: 0, requiresReview: false, url: formData?.url || '', timestamp: new Date().toISOString() };
  }

  for (const form of formData.forms) {
    if (form.hasCaptcha) { console.log('[SimpleMapper] Skipping CAPTCHA form'); continue; }

    console.log(`[SimpleMapper] Processing form "${form.id}" — ${form.fields.length} fields`);

    for (const field of form.fields) {
      const match = matchField(field, innerProfile);
      if (match) {
        matches.push(match);
      } else {
        unmatchedFormFields.push({ id: field.id, label: field.label || field.name, type: field.type, selector: field.selector });
      }
    }
  }

  console.log(`[SimpleMapper] Done — ${matches.length} matched, ${unmatchedFormFields.length} unmatched`);

  return {
    matches,
    unmatchedFormFields,
    overallConfidence: matches.length > 0 ? 0.95 : 0,
    requiresReview: false,
    url: formData.url || '',
    timestamp: new Date().toISOString()
  };
}
