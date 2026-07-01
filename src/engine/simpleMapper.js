/**
 * Simple Mapper — flat keyword match
 * Checks if label / name / placeholder / ariaLabel / id contains a keyword.
 * To add a new field: add one object to RULES. That's it.
 */

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

const RULES = [
  // ─ Personal ────────────────────────────────────────────────────────
  {
    profilePath: 'profile.personal.firstName',
    keywords: ['first name', 'firstname', 'fname', 'given name', 'first'],
    // Negative: must NOT also contain 'last' (avoids matching "first and last name")
    negative: ['last'],
    getValue: p => get(p, 'personal', 'firstName')
  },
  {
    profilePath: 'profile.personal.lastName',
    keywords: ['last name', 'lastname', 'lname', 'surname', 'family name', 'last'],
    negative: [],
    getValue: p => get(p, 'personal', 'lastName')
  },
  {
    profilePath: 'profile.personal.email',
    keywords: ['email', 'e-mail', 'mail'],
    negative: [],
    getValue: p => get(p, 'personal', 'email')
  },
  {
    profilePath: 'profile.personal.phone',
    keywords: ['phone', 'mobile', 'telephone', 'cell', 'contact number', 'phone number'],
    negative: [],
    getValue: p => get(p, 'personal', 'phone')
  },
  {
    profilePath: 'profile.personal.address',
    keywords: ['address', 'street'],
    negative: ['email'],
    getValue: p => get(p, 'personal', 'address')
  },
  {
    profilePath: 'profile.personal.city',
    keywords: ['city', 'town'],
    negative: [],
    getValue: p => get(p, 'personal', 'city')
  },
  {
    profilePath: 'profile.personal.state',
    keywords: ['state', 'province', 'region'],
    negative: [],
    getValue: p => get(p, 'personal', 'state')
  },
  {
    profilePath: 'profile.personal.zipCode',
    keywords: ['zip', 'postal', 'postcode', 'zip code', 'postal code'],
    negative: [],
    getValue: p => get(p, 'personal', 'zipCode')
  },
  {
    profilePath: 'profile.personal.country',
    keywords: ['country', 'nation'],
    negative: [],
    getValue: p => get(p, 'personal', 'country')
  },
  // ─ Links ──────────────────────────────────────────────────────────
  {
    profilePath: 'profile.links.linkedin',
    keywords: ['linkedin'],
    negative: [],
    getValue: p => get(p, 'links', 'linkedin')
  },
  {
    profilePath: 'profile.links.github',
    keywords: ['github'],
    negative: [],
    getValue: p => get(p, 'links', 'github')
  },
  {
    profilePath: 'profile.links.portfolio',
    keywords: ['portfolio'],
    negative: [],
    getValue: p => get(p, 'links', 'portfolio')
  },
  {
    profilePath: 'profile.links.website',
    keywords: ['website', 'web page', 'personal site', 'homepage'],
    negative: ['linkedin', 'github', 'portfolio'],
    getValue: p => get(p, 'links', 'website')
  },
  // ─ Education ──────────────────────────────────────────────────
  {
    profilePath: 'profile.education.university',
    keywords: ['university', 'college', 'school', 'institution', 'alma mater'],
    negative: [],
    getValue: p => get(p, 'education', 'university')
  },
  {
    profilePath: 'profile.education.degree',
    keywords: ['degree', 'qualification', 'education level'],
    negative: [],
    getValue: p => get(p, 'education', 'degree')
  },
  {
    profilePath: 'profile.education.major',
    keywords: ['major', 'field of study', 'specialization', 'subject'],
    negative: [],
    getValue: p => get(p, 'education', 'major')
  },
  {
    profilePath: 'profile.education.graduationYear',
    keywords: ['graduation year', 'grad year', 'year of graduation'],
    negative: [],
    getValue: p => get(p, 'education', 'graduationYear')
  },
  {
    profilePath: 'profile.education.gpa',
    keywords: ['gpa', 'grade point', 'cgpa', 'grades'],
    negative: [],
    getValue: p => get(p, 'education', 'gpa')
  },
  // ─ Experience ────────────────────────────────────────────────
  {
    profilePath: 'profile.experience.currentRole',
    keywords: ['current role', 'job title', 'position', 'designation', 'role', 'title'],
    negative: ['company', 'employer'],
    getValue: p => get(p, 'experience', 'currentRole')
  },
  {
    profilePath: 'profile.experience.currentCompany',
    keywords: ['company', 'employer', 'organization', 'current company', 'current employer'],
    negative: [],
    getValue: p => get(p, 'experience', 'currentCompany')
  },
  {
    profilePath: 'profile.experience.yearsOfExperience',
    keywords: ['years of experience', 'experience', 'years experience', 'work experience'],
    negative: [],
    getValue: p => get(p, 'experience', 'yearsOfExperience')
  },
  {
    profilePath: 'profile.experience.skills',
    keywords: ['skill', 'expertise', 'competencies', 'technical skills', 'abilities'],
    negative: [],
    getValue: p => get(p, 'experience', 'skills')
  }
];

function norm(str) {
  return (str || '').toLowerCase().trim();
}

function getSources(field) {
  return [
    norm(field.label),
    norm(field.name),
    norm(field.placeholder),
    norm(field.ariaLabel),
    norm(field.id)
  ].filter(Boolean);
}

function matchField(field, innerProfile) {
  const sources = getSources(field);
  const combined = sources.join(' ');
  console.log(`[SimpleMapper] Field "${field.label || field.name || field.id}" sources:`, sources);

  for (const rule of RULES) {
    // Check negative keywords first
    const hasNegative = rule.negative.some(neg => combined.includes(norm(neg)));
    if (hasNegative) continue;

    // Check positive keywords against each source
    for (const kw of rule.keywords) {
      const kwNorm = norm(kw);
      if (sources.some(src => src.includes(kwNorm))) {
        const value = rule.getValue(innerProfile);
        console.log(`  ✅ Keyword "${kw}" matched → ${rule.profilePath} = "${value}"`);
        if (!value) {
          console.warn(`  ⚠️ Profile value empty for ${rule.profilePath} — skipping`);
          return null;
        }
        return {
          formFieldId: field.id,
          formFieldSelector: field.selector,
          formFieldLabel: field.label || field.ariaLabel || field.placeholder || field.name,
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

  console.log(`  ❌ No keyword matched for "${field.label || field.name || field.id}"`);
  return null;
}

export function simpleMapProfileToForm(innerProfile, formData) {
  console.log('[SimpleMapper] ─── Starting mapping ───');
  console.log('[SimpleMapper] Profile keys:', innerProfile ? Object.keys(innerProfile) : 'NULL');

  const matches = [];
  const unmatchedFormFields = [];

  if (!innerProfile || !formData?.forms) {
    return { matches: [], unmatchedFormFields: [], overallConfidence: 0, requiresReview: false, url: formData?.url || '', timestamp: new Date().toISOString() };
  }

  for (const form of formData.forms) {
    if (form.hasCaptcha) { console.log('[SimpleMapper] Skipping CAPTCHA form'); continue; }
    console.log(`[SimpleMapper] Form "${form.id}" — ${form.fields.length} fields`);

    for (const field of form.fields) {
      const match = matchField(field, innerProfile);
      if (match) matches.push(match);
      else unmatchedFormFields.push({ id: field.id, label: field.label || field.name, type: field.type, selector: field.selector });
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
