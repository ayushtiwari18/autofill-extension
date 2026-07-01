/**
 * Simple Mapper — flat keyword match
 * Each RULE: { profilePath, keywords[], negative[], getValue(profile) }
 * A field matches if ANY source (label/name/placeholder/ariaLabel/id)
 * CONTAINS a keyword AND NONE of the negative keywords appear in that
 * same source.
 *
 * ADDING A NEW FIELD: just append one object to RULES below.
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

// ──────────────────────────────────────────────────────────────────────
const RULES = [

  // ─ FULL NAME (must come BEFORE firstName/lastName rules) ────────────
  // When label is "Full Name", fill firstName + space + lastName
  {
    profilePath: 'profile.personal.fullName',
    keywords: ['full name', 'fullname', 'your name', 'candidate name', 'applicant name', 'complete name'],
    negative: ['first', 'last', 'middle'],
    getValue: p => [get(p, 'personal', 'firstName'), get(p, 'personal', 'lastName')].filter(Boolean).join(' ')
  },

  // ─ First Name ────────────────────────────────────────────────────
  {
    profilePath: 'profile.personal.firstName',
    keywords: ['first name', 'firstname', 'fname', 'given name'],
    negative: ['last', 'full', 'middle'],
    getValue: p => get(p, 'personal', 'firstName')
  },

  // ─ Last / Family Name ────────────────────────────────────────────
  {
    profilePath: 'profile.personal.lastName',
    keywords: ['last name', 'lastname', 'lname', 'surname', 'family name'],
    negative: ['first', 'full', 'middle'],
    getValue: p => get(p, 'personal', 'lastName')
  },

  // ─ Email ─────────────────────────────────────────────────────────
  {
    profilePath: 'profile.personal.email',
    keywords: ['email', 'e-mail', 'mail', 'email address', 'email id'],
    negative: [],
    getValue: p => get(p, 'personal', 'email')
  },

  // ─ Phone / Contact Number ──────────────────────────────────────
  {
    profilePath: 'profile.personal.phone',
    keywords: ['phone', 'mobile', 'telephone', 'cell', 'contact number', 'phone number', 'mobile number', 'contact no', 'whatsapp'],
    negative: ['email'],
    getValue: p => get(p, 'personal', 'phone')
  },

  // ─ Job Position / Role (must come BEFORE generic 'role'/'title') ───
  {
    profilePath: 'profile.experience.currentRole',
    keywords: ['job position', 'position applied', 'applying for', 'apply for', 'job title', 'current role', 'designation', 'job role', 'role', 'title', 'position'],
    negative: ['company', 'employer', 'organization', 'school', 'college'],
    getValue: p => get(p, 'experience', 'currentRole')
  },

  // ─ Address ───────────────────────────────────────────────────
  {
    profilePath: 'profile.personal.address',
    keywords: ['address', 'street', 'current address', 'residential'],
    negative: ['email', 'web', 'url'],
    getValue: p => get(p, 'personal', 'address')
  },

  // ─ City ──────────────────────────────────────────────────────────
  {
    profilePath: 'profile.personal.city',
    keywords: ['city', 'town', 'current city', 'home city'],
    negative: [],
    getValue: p => get(p, 'personal', 'city')
  },

  // ─ State ─────────────────────────────────────────────────────────
  {
    profilePath: 'profile.personal.state',
    keywords: ['state', 'province', 'region'],
    negative: [],
    getValue: p => get(p, 'personal', 'state')
  },

  // ─ ZIP / Postal ───────────────────────────────────────────────
  {
    profilePath: 'profile.personal.zipCode',
    keywords: ['zip', 'postal', 'postcode', 'pin code', 'pincode'],
    negative: [],
    getValue: p => get(p, 'personal', 'zipCode')
  },

  // ─ Country ────────────────────────────────────────────────────
  {
    profilePath: 'profile.personal.country',
    keywords: ['country', 'nation'],
    negative: [],
    getValue: p => get(p, 'personal', 'country')
  },

  // ─ LinkedIn ──────────────────────────────────────────────────
  {
    profilePath: 'profile.links.linkedin',
    keywords: ['linkedin', 'linked in'],
    negative: [],
    getValue: p => get(p, 'links', 'linkedin')
  },

  // ─ GitHub ─────────────────────────────────────────────────────
  {
    profilePath: 'profile.links.github',
    keywords: ['github', 'git hub'],
    negative: [],
    getValue: p => get(p, 'links', 'github')
  },

  // ─ Portfolio ─────────────────────────────────────────────────
  {
    profilePath: 'profile.links.portfolio',
    keywords: ['portfolio'],
    negative: [],
    getValue: p => get(p, 'links', 'portfolio')
  },

  // ─ Website ──────────────────────────────────────────────────
  {
    profilePath: 'profile.links.website',
    keywords: ['website', 'web page', 'personal site', 'homepage'],
    negative: ['linkedin', 'github', 'portfolio'],
    getValue: p => get(p, 'links', 'website')
  },

  // ─ University ───────────────────────────────────────────────
  {
    profilePath: 'profile.education.university',
    keywords: ['university', 'college', 'institution', 'alma mater', 'school name'],
    negative: [],
    getValue: p => get(p, 'education', 'university')
  },

  // ─ Degree ────────────────────────────────────────────────────
  {
    profilePath: 'profile.education.degree',
    keywords: ['degree', 'qualification', 'highest education', 'education level'],
    negative: [],
    getValue: p => get(p, 'education', 'degree')
  },

  // ─ Major / Field of Study ─────────────────────────────────────
  {
    profilePath: 'profile.education.major',
    keywords: ['major', 'field of study', 'specialization', 'branch', 'stream'],
    negative: [],
    getValue: p => get(p, 'education', 'major')
  },

  // ─ Graduation Year ──────────────────────────────────────────
  {
    profilePath: 'profile.education.graduationYear',
    keywords: ['graduation year', 'grad year', 'passing year', 'year of passing', 'pass out year'],
    negative: [],
    getValue: p => get(p, 'education', 'graduationYear')
  },

  // ─ GPA ───────────────────────────────────────────────────────
  {
    profilePath: 'profile.education.gpa',
    keywords: ['gpa', 'cgpa', 'grade point', 'percentage', 'marks', 'score'],
    negative: [],
    getValue: p => get(p, 'education', 'gpa')
  },

  // ─ Current Company ─────────────────────────────────────────
  {
    profilePath: 'profile.experience.currentCompany',
    keywords: ['company', 'employer', 'organization', 'current company', 'current employer', 'where do you work'],
    negative: [],
    getValue: p => get(p, 'experience', 'currentCompany')
  },

  // ─ Years of Experience ─────────────────────────────────────
  {
    profilePath: 'profile.experience.yearsOfExperience',
    keywords: ['years of experience', 'work experience', 'total experience', 'experience in years', 'how many years'],
    negative: [],
    getValue: p => get(p, 'experience', 'yearsOfExperience')
  },

  // ─ Skills ─────────────────────────────────────────────────────
  {
    profilePath: 'profile.experience.skills',
    keywords: ['skill', 'expertise', 'competencies', 'technical skills', 'technologies', 'tools', 'key skills'],
    negative: [],
    getValue: p => get(p, 'experience', 'skills')
  }
];

// ─────────────────────────────────────────────────────────────────────
function norm(str) {
  return (str || '').toLowerCase().trim();
}

function getSources(field) {
  // Only non-empty, de-duped sources
  const raw = [
    norm(field.label),
    norm(field.ariaLabel),
    norm(field.placeholder),
    // name/id often garbage on Google Forms — only use if no label exists
    ...((!field.label && !field.ariaLabel) ? [norm(field.name), norm(field.id)] : [])
  ];
  return [...new Set(raw.filter(Boolean))];
}

function sourceMatchesKeyword(src, kw) {
  return src.includes(kw);
}

function sourceHasNegative(src, negatives) {
  return negatives.some(neg => src.includes(norm(neg)));
}

function matchField(field, innerProfile) {
  const sources = getSources(field);
  console.log(`[SimpleMapper] Field "${field.label || field.ariaLabel || field.name || field.id}" sources:`, sources);

  for (const rule of RULES) {
    for (const src of sources) {
      // Skip if this source contains a negative keyword
      if (sourceHasNegative(src, rule.negative)) continue;

      for (const kw of rule.keywords) {
        if (sourceMatchesKeyword(src, norm(kw))) {
          const value = rule.getValue(innerProfile);
          console.log(`  ✅ Keyword "${kw}" in src "${src}" → ${rule.profilePath} = "${value}"`);
          if (!value) {
            console.warn(`  ⚠️ Profile value empty for ${rule.profilePath} — skipping`);
            break; // try next rule
          }
          return {
            formFieldId:       field.id,
            formFieldSelector: field.selector,
            formFieldIndex:    typeof field.selectorIndex === 'number' ? field.selectorIndex : 0,  // ← FIX: was missing
            formFieldLabel:    field.label || field.ariaLabel || field.placeholder || field.name,
            formFieldType:     field.type,
            profilePath:       rule.profilePath,
            profileValue:      value,
            confidence:        0.95,
            matchedOn:         `${rule.profilePath} via "${kw}"`,
            requiresReview:    false
          };
        }
      }
    }
  }

  console.log(`  ❌ No keyword matched for "${field.label || field.ariaLabel || field.name || field.id}"`);
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
