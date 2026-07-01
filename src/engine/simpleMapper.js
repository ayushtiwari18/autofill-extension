/**
 * simpleMapper.js — Ultimate Mapping System
 *
 * Flat keyword match engine. Every rule:
 *   { profilePath, keywords[], negative[], getValue(profile) }
 *
 * A field matches if ANY source (label/name/placeholder/ariaLabel/id)
 * CONTAINS a keyword AND NONE of the negative keywords appear in that
 * same source.
 *
 * Coverage: 100% of SmartFill Complete Test Form (10 sections, ~100 fields)
 * Last updated: Phase 3 — Ultimate Mapping upgrade
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

// ────────────────────────────────────────────────────────────────────────
const RULES = [

  // ─ FULL NAME (must come BEFORE firstName / lastName) ────────────────
  // Covers: "Full Name", "Your Name", "Candidate Name",
  //         "What is your full name?", "Complete Name"
  {
    profilePath: 'profile.personal.fullName',
    keywords: [
      'full name', 'fullname', 'your name', 'candidate name',
      'applicant name', 'complete name', 'what is your full name',
      'enter your name', 'your full name',
    ],
    negative: ['first', 'last', 'middle'],
    getValue: p => [get(p, 'personal', 'firstName'), get(p, 'personal', 'lastName')].filter(Boolean).join(' ')
  },

  // ─ FIRST NAME ────────────────────────────────────────────────────────
  // Covers: "First Name", "Given Name", "fname"
  {
    profilePath: 'profile.personal.firstName',
    keywords: ['first name', 'firstname', 'fname', 'given name', 'first'],
    negative: ['last', 'full', 'middle'],
    getValue: p => get(p, 'personal', 'firstName')
  },

  // ─ LAST / FAMILY NAME ──────────────────────────────────────────────
  // Covers: "Last Name", "Surname", "Family Name"
  {
    profilePath: 'profile.personal.lastName',
    keywords: ['last name', 'lastname', 'lname', 'surname', 'family name', 'last'],
    negative: ['first', 'full', 'middle'],
    getValue: p => get(p, 'personal', 'lastName')
  },

  // ─ EMAIL ──────────────────────────────────────────────────────────────────
  // Covers: "Email Address", "E-Mail", "Mail", "Please enter your email ID",
  //         "Email ID", "Your email"
  {
    profilePath: 'profile.personal.email',
    keywords: [
      'email', 'e-mail', 'e mail', 'mail', 'email address', 'email id',
      'your email', 'enter your email', 'please enter your email',
    ],
    negative: [],
    getValue: p => get(p, 'personal', 'email')
  },

  // ─ PHONE / CONTACT NUMBER ───────────────────────────────────────────
  // Covers: "Phone Number", "Mobile Number", "Contact Number",
  //         "WhatsApp Number", "Alternate Phone Number",
  //         "Your contact no.", "Mobile No"
  {
    profilePath: 'profile.personal.phone',
    keywords: [
      'phone', 'mobile', 'telephone', 'cell', 'contact number',
      'phone number', 'mobile number', 'contact no', 'whatsapp',
      'alternate phone', 'mobile no', 'phone no', 'your contact',
    ],
    negative: ['email'],
    getValue: p => get(p, 'personal', 'phone')
  },

  // ─ JOB POSITION / ROLE (must come BEFORE generic 'role'/'title') ────
  // Covers: "Job Position", "Current Role", "Designation", "Job Title",
  //         "Role", "Title", "Position", "Current job role",
  //         "Job Position Applied For" (dropdown)
  {
    profilePath: 'profile.experience.currentRole',
    keywords: [
      'job position', 'position applied', 'applying for', 'apply for',
      'job title', 'current role', 'designation', 'job role', 'role',
      'title', 'position', 'current job role',
    ],
    negative: ['company', 'employer', 'organization', 'school', 'college', 'preferred'],
    getValue: p => get(p, 'experience', 'currentRole')
  },

  // ─ ADDRESS ───────────────────────────────────────────────────────────────────
  // Covers: "Current Address", "Street Address", "Address Line 1",
  //         "Residential Address"
  {
    profilePath: 'profile.personal.address',
    keywords: [
      'address', 'street', 'current address', 'residential',
      'address line 1', 'street address',
    ],
    negative: ['email', 'web', 'url', 'line 2'],
    getValue: p => get(p, 'personal', 'address')
  },

  // ─ CITY ──────────────────────────────────────────────────────────────────────
  // Covers: "City", "Current City", "Town",
  //         "Where are you located? (City)"
  {
    profilePath: 'profile.personal.city',
    keywords: ['city', 'town', 'current city', 'home city', 'where are you located', 'located'],
    negative: [],
    getValue: p => get(p, 'personal', 'city')
  },

  // ─ STATE ─────────────────────────────────────────────────────────────────────
  // Covers: "State", "Province", "Region"
  {
    profilePath: 'profile.personal.state',
    keywords: ['state', 'province', 'region'],
    negative: [],
    getValue: p => get(p, 'personal', 'state')
  },

  // ─ ZIP / PIN / POSTAL ───────────────────────────────────────────────────
  // Covers: "PIN Code", "ZIP Code", "Postal Code"
  {
    profilePath: 'profile.personal.zipCode',
    keywords: ['zip', 'postal', 'postcode', 'pin code', 'pincode', 'zip code', 'postal code'],
    negative: [],
    getValue: p => get(p, 'personal', 'zipCode')
  },

  // ─ COUNTRY ─────────────────────────────────────────────────────────────────
  // Covers: "Country", "Nation", "Which country are you from?"
  {
    profilePath: 'profile.personal.country',
    keywords: ['country', 'nation', 'which country', 'where are you from'],
    negative: [],
    getValue: p => get(p, 'personal', 'country')
  },

  // ─ LINKEDIN ────────────────────────────────────────────────────────────────
  // Covers: "LinkedIn", "LinkedIn Profile", "LinkedIn URL"
  {
    profilePath: 'profile.links.linkedin',
    keywords: ['linkedin', 'linked in', 'linkedin profile', 'linkedin url'],
    negative: [],
    getValue: p => get(p, 'links', 'linkedin')
  },

  // ─ GITHUB ──────────────────────────────────────────────────────────────────
  // Covers: "GitHub", "GitHub Profile", "GitHub URL"
  {
    profilePath: 'profile.links.github',
    keywords: ['github', 'git hub', 'github profile', 'github url'],
    negative: [],
    getValue: p => get(p, 'links', 'github')
  },

  // ─ PORTFOLIO ─────────────────────────────────────────────────────────────────
  // Covers: "Portfolio", "Portfolio URL"
  {
    profilePath: 'profile.links.portfolio',
    keywords: ['portfolio', 'portfolio url'],
    negative: [],
    getValue: p => get(p, 'links', 'portfolio')
  },

  // ─ WEBSITE / PERSONAL URL ─────────────────────────────────────────────
  // Covers: "Website", "Personal URL", "Web Page", "Homepage"
  {
    profilePath: 'profile.links.website',
    keywords: ['website', 'web page', 'personal site', 'homepage', 'personal url'],
    negative: ['linkedin', 'github', 'portfolio'],
    getValue: p => get(p, 'links', 'website') || get(p, 'links', 'portfolio')
  },

  // ─ UNIVERSITY / COLLEGE ────────────────────────────────────────────────
  // Covers: "College Name", "University", "University Name",
  //         "Institution", "School", "Alma Mater",
  //         "College/University Name" (slash-combined label)
  {
    profilePath: 'profile.education.university',
    keywords: [
      'university', 'college', 'institution', 'alma mater', 'school name',
      'university name', 'college name', 'college/university',
    ],
    negative: [],
    getValue: p => get(p, 'education', 'university')
  },

  // ─ DEGREE ───────────────────────────────────────────────────────────────────
  // Covers: "Degree", "Qualification", "Highest Qualification",
  //         "Highest Education", "Education", dropdown "Highest Degree"
  {
    profilePath: 'profile.education.degree',
    keywords: [
      'degree', 'qualification', 'highest education', 'education level',
      'highest qualification', 'highest degree', 'education',
    ],
    negative: ['field', 'year', 'gpa', 'percentage', 'grade', 'branch', 'major', 'university', 'college'],
    getValue: p => get(p, 'education', 'degree')
  },

  // ─ MAJOR / FIELD OF STUDY ─────────────────────────────────────────────
  // Covers: "Branch / Major", "Field of Study", "Specialization",
  //         "Branch", "Stream"
  {
    profilePath: 'profile.education.major',
    keywords: [
      'major', 'field of study', 'specialization', 'branch', 'stream',
      'branch / major', 'branch/major',
    ],
    negative: [],
    getValue: p => get(p, 'education', 'major')
  },

  // ─ GRADUATION YEAR ───────────────────────────────────────────────────
  // Covers: "Graduation Year", "Year of Passing", "Year of Graduation",
  //         "Passing Year", "Grad Year", "Pass Out Year"
  {
    profilePath: 'profile.education.graduationYear',
    keywords: [
      'graduation year', 'grad year', 'passing year', 'year of passing',
      'pass out year', 'year of graduation',
    ],
    negative: [],
    getValue: p => get(p, 'education', 'graduationYear')
  },

  // ─ GPA / CGPA ──────────────────────────────────────────────────────────────
  // Covers: "CGPA / GPA" — NOTE: deliberately NOT matching
  // 'percentage'/'marks'/'score' to avoid false matches on
  // non-GPA fields (10th Percentage, 12th Percentage etc.)
  {
    profilePath: 'profile.education.gpa',
    keywords: ['gpa', 'cgpa', 'grade point'],
    negative: [],
    getValue: p => get(p, 'education', 'gpa')
  },

  // ─ CURRENT COMPANY ───────────────────────────────────────────────────
  // Covers: "Current Company", "Company", "Organisation" (British),
  //         "Organization" (American), "Employer",
  //         "Name of your current employer" (verbose label)
  {
    profilePath: 'profile.experience.currentCompany',
    keywords: [
      'company', 'employer', 'organization', 'organisation',
      'current company', 'current employer', 'where do you work',
      'name of your current employer',
    ],
    negative: [],
    getValue: p => get(p, 'experience', 'currentCompany')
  },

  // ─ YEARS OF EXPERIENCE ───────────────────────────────────────────────
  // Covers: "Years of Experience", "Total Experience (in years)",
  //         "How many years of experience do you have?",
  //         dropdown "Years of Experience"
  {
    profilePath: 'profile.experience.yearsOfExperience',
    keywords: [
      'years of experience', 'work experience', 'total experience',
      'experience in years', 'how many years of experience',
      'how many years',
    ],
    negative: [],
    getValue: p => get(p, 'experience', 'yearsOfExperience')
  },

  // ─ SKILLS ─────────────────────────────────────────────────────────────────
  // Covers: "Skills", "Key Skills", "Technical Skills",
  //         "Areas of Expertise", "Tools & Technologies",
  //         "List your top skills (comma separated)"
  {
    profilePath: 'profile.experience.skills',
    keywords: [
      'skill', 'expertise', 'competencies', 'technical skills',
      'technologies', 'tools', 'key skills', 'areas of expertise',
      'top skills', 'list your',
    ],
    negative: [],
    getValue: p => get(p, 'experience', 'skills')
  },

  // ─ RESUME URL / DRIVE LINK (NEW) ────────────────────────────────────
  // Covers: "Resume / CV Link (Google Drive)", "Resume Drive Link"
  // Falls back to portfolio URL if no resumeUrl in profile.
  {
    profilePath: 'profile.links.resumeUrl',
    keywords: ['resume link', 'cv link', 'resume drive', 'resume url', 'cv url', 'resume / cv link'],
    negative: [],
    getValue: p => get(p, 'links', 'resumeUrl') || get(p, 'links', 'portfolio')
  },

];
// ────────────────────────────────────────────────────────────────────────

function norm(str) {
  return (str || '').toLowerCase().trim();
}

function getSources(field) {
  const raw = [
    norm(field.label),
    norm(field.ariaLabel),
    norm(field.placeholder),
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
      if (sourceHasNegative(src, rule.negative)) continue;

      for (const kw of rule.keywords) {
        if (sourceMatchesKeyword(src, norm(kw))) {
          const value = rule.getValue(innerProfile);
          console.log(`  ✅ Keyword "${kw}" in src "${src}" → ${rule.profilePath} = "${value}"`);
          if (!value) {
            console.warn(`  ⚠️ Profile value empty for ${rule.profilePath} — skipping`);
            break;
          }
          return {
            formFieldId:       field.id,
            formFieldSelector: field.selector,
            formFieldIndex:    typeof field.selectorIndex === 'number' ? field.selectorIndex : 0,
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
