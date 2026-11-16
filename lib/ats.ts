export type ScoreDimension = {
  id: string;
  label: string;
  score: number | null;
  weight: number;
  detail: string;
};

export type ResumeRecommendation = {
  id: string;
  text: string;
  draftText: string;
};

const STOP_WORDS = new Set(
  `a an and are as at be been being by can candidate capabilities capable of for from had has have having he her his how in including into is it its job may more most must need needed our over role responsibilities responsible should skills strong team the their them they this through to us using was we well will with within would you your years year work working experience experienced required requirements preferred qualification qualifications opportunity position`.split(
    " "
  )
);
const SHORT_TECH_TERMS = new Set(["ai", "hr", "go", "qa", "ui", "ux"]);
const REQUIRED_LANGUAGE = /\b(required|must have|must|required to|minimum|essential)\b/i;

const ALIASES: Record<string, string[]> = {
  "stakeholder management": ["stakeholder management"],
  "project management": ["project management"],
  "product management": ["product management"],
  "team leadership": ["team leadership"],
  "data analysis": ["data analysis"],
  "data analytics": ["data analytics"],
  "customer service": ["customer service"],
  "business development": ["business development"],
  "problem solving": ["problem solving"],
  "time management": ["time management"],
  "communication skills": ["communication skills"],
  javascript: ["javascript", "js"],
  typescript: ["typescript", "ts"],
  "node js": ["node js", "nodejs"],
  "react js": ["react", "react js"],
  "c plus plus": ["cplusplus", "c plus plus"],
  "c sharp": ["csharp", "c sharp"],
  dotnet: ["dotnet", "dot net", "net framework"],
  aws: ["aws", "amazon web services"],
  gcp: ["gcp", "google cloud platform"],
  azure: ["azure", "microsoft azure"],
  kubernetes: ["kubernetes", "k8s"],
  "ci cd": ["ci cd", "continuous integration", "continuous delivery", "continuous deployment"],
  "machine learning": ["machine learning", "ml"],
  "artificial intelligence": ["artificial intelligence", "ai"],
  "power bi": ["power bi", "powerbi"],
  "ms office": ["ms office", "microsoft office"]
};

const EDUCATION_REQUIREMENTS: Array<{ label: string; aliases: string[] }> = [
  { label: "bachelor's degree", aliases: ["bachelor", "bachelors", "bachelor degree", "bachelors degree"] },
  { label: "master's degree", aliases: ["master", "masters", "master degree", "masters degree"] },
  { label: "associate degree", aliases: ["associate degree", "associates degree"] },
  { label: "doctorate / PhD", aliases: ["phd", "doctorate", "doctoral degree"] },
  { label: "high school diploma", aliases: ["high school diploma", "ged"] },
  { label: "certification", aliases: ["certification", "certified", "license", "licensed", "certificate"] },
  { label: "PMP", aliases: ["pmp"] },
  { label: "CPA", aliases: ["cpa"] },
  { label: "CISSP", aliases: ["cissp"] },
  { label: "MBA", aliases: ["mba"] }
];

const ROLE_WORDS = new Set(
  `accountant administrator analyst architect coordinator consultant designer developer director engineer executive lead manager nurse officer operator product scientist specialist teacher technician`.split(
    " "
  )
);
const SENIORITY_WORDS = new Set(
  `associate junior mid senior staff principal lead director head chief`.split(" ")
);
const SENIORITY_PRIORITY: Record<string, number> = {
  associate: 1,
  junior: 2,
  mid: 3,
  senior: 4,
  staff: 5,
  principal: 6,
  lead: 5,
  director: 6,
  head: 6,
  chief: 7
};
const SECTION_PATTERNS: Record<string, RegExp> = {
  experience: /^(professional )?(work )?(experience|employment|work history|career history)$/,
  education: /^(education|academic background|qualifications)$/,
  skills: /^(technical skills|core skills|skills|areas of expertise|competencies)$/,
  projects: /^(projects|selected projects|portfolio)$/
};
type SectionName = keyof typeof SECTION_PATTERNS;

const PHRASE_ALIASES = Object.entries(ALIASES).flatMap(([term, aliases]) =>
  aliases
    .map(normalizeText)
    .filter((alias) => alias.includes(" "))
    .map((alias) => ({ term, alias }))
);

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/c\+\+/g, "cplusplus")
    .replace(/c#/g, "csharp")
    .replace(/\.net/g, "dotnet")
    .replace(/node\.js/g, "nodejs")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTerm(term: string) {
  return normalizeText(term);
}

function createTermMatcher(text: string) {
  const normalizedText = ` ${normalizeText(text)} `;
  return (term: string) => {
    const normalizedTerm = normalizeTerm(term);
    return Boolean(normalizedTerm) && normalizedText.includes(` ${normalizedTerm} `);
  };
}

function aliasesFor(term: string) {
  const normalizedTerm = normalizeTerm(term);
  return ALIASES[normalizedTerm] ?? [term];
}

function termIsPresent(matches: (term: string) => boolean, term: string) {
  return aliasesFor(term).some(matches);
}

function extractJobTerms(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const counts = new Map<string, number>();
  const requiredBoost = new Map<string, number>();
  const sentences = text.split(/[\n.!?;,]+/);
  const addTerms = (input: string, boost = 0) => {
    const words = normalizeText(input).split(" ").filter(Boolean);
    const isUseful = (word: string) =>
      !STOP_WORDS.has(word) && (word.length > 2 || SHORT_TECH_TERMS.has(word));

    for (let index = 0; index < words.length; index += 1) {
      const word = words[index];
      if (!isUseful(word)) continue;

      const candidates = [word];
      for (const { term, alias } of PHRASE_ALIASES) {
        if (words.slice(index, index + alias.split(" ").length).join(" ") === alias) {
          candidates.push(term);
        }
      }

      for (const term of candidates) {
        counts.set(term, (counts.get(term) ?? 0) + 1);
        if (boost) requiredBoost.set(term, (requiredBoost.get(term) ?? 0) + boost);
      }
    }
  };

  addTerms(text);
  for (const sentence of sentences) {
    if (REQUIRED_LANGUAGE.test(sentence)) addTerms(sentence, 2);
  }

  const ranked = [...counts.entries()]
    .map(([term, count]) => ({
      term,
      rank: count + (term.includes(" ") ? 1.5 : 0) + (requiredBoost.get(term) ?? 0)
    }))
    .sort((a, b) => b.rank - a.rank || b.term.length - a.term.length);

  const selected: string[] = [];
  for (const candidate of ranked) {
    const isDuplicate = selected.some(
      (term) => term.includes(candidate.term) && term !== candidate.term
    );
    if (isDuplicate) continue;
    selected.push(candidate.term);
    if (selected.length >= 18) break;
  }
  return selected;
}

function getSection(text: string, sectionName: SectionName) {
  const lines = text.split(/\r?\n/);
  const normalizedLines = lines.map(normalizeText);
  const startIndex = normalizedLines.findIndex((line) => SECTION_PATTERNS[sectionName].test(line));
  if (startIndex < 0) return { text: "", found: false };

  const nextHeadingIndex = normalizedLines.findIndex(
    (line, index) => index > startIndex && Object.values(SECTION_PATTERNS).some((pattern) => pattern.test(line))
  );
  return {
    text: lines.slice(startIndex + 1, nextHeadingIndex < 0 ? undefined : nextHeadingIndex).join(" "),
    found: true
  };
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function inferJobTitle(jobDescription: string) {
  const lines = jobDescription.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const explicitTitle = jobDescription.match(
    /(?:job title|position|role)\s*[:\-]\s*([^\n.;]{3,80})/i
  )?.[1];
  const candidates = explicitTitle ? [explicitTitle, ...lines] : lines;
  const detectedTitle = candidates.find((line) => {
    return normalizeText(line).split(" ").some((word) => ROLE_WORDS.has(word));
  });
  if (!detectedTitle) return "";
  if (detectedTitle.length <= 90 || explicitTitle) return detectedTitle;

  const words = normalizeText(detectedTitle).split(" ");
  const roleIndex = words.findIndex((word) => ROLE_WORDS.has(word));
  return words.slice(Math.max(0, roleIndex - 2), roleIndex + 1).join(" ");
}

function extractExperienceYears(text: string) {
  const values = Array.from(
    text.matchAll(/(\d+)\s*(?:\+|plus)?\s*(?:years?|yrs?)(?:\s*(?:of\s*experience|in|leading|working|managing|driving|with|across))?/gi)
  ).map((match) => Number(match[1]));
  return values.length ? Math.max(...values) : 0;
}

function extractSeniority(text: string) {
  const normalizedText = normalizeText(text);
  for (const seniority of Object.keys(SENIORITY_PRIORITY)) {
    if (normalizedText.includes(seniority)) return seniority;
  }
  return "";
}

function buildRecommendations({
  missingKeywords,
  dimensions,
  missingSections,
  missingEducation
}: {
  missingKeywords: string[];
  dimensions: ScoreDimension[];
  missingSections: string[];
  missingEducation: string[];
}): ResumeRecommendation[] {
  const recommendations: ResumeRecommendation[] = [];
  const byId = new Map(dimensions.map((dimension) => [dimension.id, dimension]));

  if (missingKeywords.length) {
    const terms = missingKeywords.slice(0, 3);
    recommendations.push({
      id: "missing-keywords",
      text: `Address ${terms.join(", ")} in a relevant experience or skills bullet, but only where it accurately reflects your background.`,
      draftText: `• [Action you personally took] using ${terms.join(", ")} to [solve a relevant problem], resulting in [truthful, specific outcome].`
    });
  }
  if ((byId.get("experience")?.score ?? 100) < 70) {
    recommendations.push({
      id: "experience-section",
      text: "Make the most relevant responsibilities and outcomes easy to find under a clearly labeled Experience section.",
      draftText: "EXPERIENCE\n[Job Title] | [Organization] | [Dates]\n• [Relevant responsibility or achievement, with a truthful result]"
    });
  }
  if ((byId.get("title")?.score ?? 100) < 70) {
    recommendations.push({
      id: "title-alignment",
      text: "If accurate, align your resume headline and role descriptions with the target position and seniority.",
      draftText: "[Target job title that accurately reflects your experience] | [Relevant specialization] | [Top substantiated skill]"
    });
  }
  if (missingEducation.length) {
    recommendations.push({
      id: "credentials",
      text: `If you hold them, list the requested ${missingEducation.slice(0, 2).join(" and ")} in Education or Certifications; do not imply a credential you do not have.`,
      draftText: `EDUCATION / CERTIFICATIONS\n[Credential you actually hold] — [Institution or issuing organization], [Year]`
    });
  }
  if (missingSections.length) {
    recommendations.push({
      id: "section-headings",
      text: `Use standard section headings for ${missingSections.join(", ")} so resume parsers and recruiters can locate the information.`,
      draftText: `${missingSections.map((section) => `${section.toUpperCase()}\n[Add relevant information you can substantiate]`).join("\n\n")}`
    });
  }
  if ((byId.get("impact")?.score ?? 100) < 70) {
    recommendations.push({
      id: "quantified-impact",
      text: "Strengthen relevant accomplishment bullets with truthful scale or outcomes—for example, time saved, volume handled, quality improved, or revenue supported.",
      draftText: "• [Action you took] to [measurable result], improving [metric] by [verified amount] over [time period]."
    });
  }
  if (!recommendations.length) {
    recommendations.push({
      id: "maintain-evidence",
      text: "Your resume covers the detected requirements well. Keep the evidence specific, truthful, and easy to scan; this estimate cannot predict a particular employer's ATS result.",
      draftText: "• [A relevant accomplishment] demonstrating [job-related skill], supported by [specific evidence or result]."
    });
  }
  return recommendations.slice(0, 5);
}

export function calculateAtsScore(resumeText: string, jobDescription: string) {
  const jobTerms = extractJobTerms(jobDescription);
  const matchesResume = createTermMatcher(resumeText);
  const matchesJobDescription = createTermMatcher(jobDescription);
  const matchedKeywords = jobTerms.filter((term) => termIsPresent(matchesResume, term));
  const missingKeywords = jobTerms.filter((term) => !matchedKeywords.includes(term));
  const resumeLines = resumeText.split(/\r?\n/).map((line) => ({
    text: line.trim(),
    matches: createTermMatcher(line)
  })).filter((line) => line.text);
  const matchedEvidence = matchedKeywords.map((term) => {
    const evidence = resumeLines.find((line) => termIsPresent(line.matches, term));
    return {
      term,
      snippet: evidence?.text.slice(0, 200) ?? `Found in extracted resume text: ${term}`
    };
  });
  const requiredLines = jobDescription.split(/[\n.!?;]+/).filter((line) =>
    REQUIRED_LANGUAGE.test(line)
  ).map(createTermMatcher);
  const requiredGaps = jobTerms.filter(
    (term) => requiredLines.some((matches) => termIsPresent(matches, term)) && !matchedKeywords.includes(term)
  );

  const experienceSection = getSection(resumeText, "experience");
  const educationSection = getSection(resumeText, "education");
  const skillsSection = getSection(resumeText, "skills");
  const relevantExperienceText = experienceSection.found ? experienceSection.text : resumeText;
  const matchesExperience = createTermMatcher(relevantExperienceText);
  const experienceMatches = jobTerms.filter((term) => termIsPresent(matchesExperience, term));
  const resumeExperienceYears = extractExperienceYears(resumeText);
  const jobExperienceYears = extractExperienceYears(jobDescription);
  const resumeSeniority = extractSeniority(resumeText);
  const jobSeniority = extractSeniority(jobDescription);
  const title = inferJobTitle(jobDescription);
  const titleTerms = normalizeText(title)
    .split(" ")
    .filter((word) => ROLE_WORDS.has(word) || SENIORITY_WORDS.has(word));
  const educationRequirements = EDUCATION_REQUIREMENTS.filter((requirement) =>
    requirement.aliases.some(matchesJobDescription)
  );
  const missingEducation = educationRequirements
    .filter((requirement) => !requirement.aliases.some(matchesResume))
    .map((requirement) => requirement.label);
  const metricLines = resumeText.split(/\r?\n/).filter((line) =>
    /(?:\b\d+(?:\.\d+)?\s?%|\b\d+(?:\.\d+)?\s?(?:percent|k|m|million|thousand|hours?|days?|weeks?|months?|years?|users?|customers?|projects?)\b|\$\s?\d)/i.test(line)
  );
  const wordCount = normalizeText(resumeText).split(" ").filter(Boolean).length;
  const roleMatchRatio = jobTerms.length ? (matchedKeywords.length / jobTerms.length) * 100 : 0;
  const titleStrength = titleTerms.length
    ? clampScore((titleTerms.filter(matchesResume).length / titleTerms.length) * 100)
    : 0;
  const seniorityFit = jobSeniority && resumeSeniority
    ? clampScore(((SENIORITY_PRIORITY[resumeSeniority] ?? 1) / (SENIORITY_PRIORITY[jobSeniority] ?? 1)) * 100)
    : 100;
  const yearsFit = jobExperienceYears > 0
    ? clampScore((resumeExperienceYears / jobExperienceYears) * 100)
    : 100;

  const dimensions: ScoreDimension[] = [
    {
      id: "skills",
      label: "Skills & requirements",
      score: jobTerms.length ? clampScore((matchedKeywords.length / jobTerms.length) * 100) : null,
      weight: 35,
      detail: `${matchedKeywords.length} of ${jobTerms.length} detected job-description terms found with exact or recognized equivalent matching.`
    },
    {
      id: "experience",
      label: "Relevant experience",
      score: jobTerms.length
        ? clampScore(
            (roleMatchRatio * 0.7) +
              (yearsFit * 0.25) +
              (experienceSection.found ? 10 : 0)
          )
        : null,
      weight: 25,
      detail: experienceSection.found
        ? `${experienceMatches.length} relevant terms found in the Experience section.`
        : "No standard Experience heading was detected; matching was checked against the full resume with a confidence reduction."
    },
    {
      id: "title",
      label: "Title & seniority",
      score: titleTerms.length
        ? clampScore(titleStrength * seniorityFit / 100)
        : null,
      weight: 15,
      detail: titleTerms.length ? `Compared ${titleTerms.join(" / ")} from the detected job title against the resume.` : "No clear job title or seniority was detected in the description."
    },
    {
      id: "education",
      label: "Education & certifications",
      score: educationRequirements.length
        ? clampScore(((educationRequirements.length - missingEducation.length) / educationRequirements.length) * 100)
        : null,
      weight: 10,
      detail: educationRequirements.length
        ? `${educationRequirements.length - missingEducation.length} of ${educationRequirements.length} stated education or credential requirements found.`
        : "The job description did not state a recognizable degree or credential requirement."
    },
    {
      id: "format",
      label: "Structure & parseability",
      score: clampScore(
        (Number(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(resumeText)) * 25) +
        (Number(experienceSection.found) * 25) +
        (Number(educationSection.found) * 15) +
        (Number(skillsSection.found) * 15) +
        (wordCount >= 100 ? 15 : wordCount >= 50 ? 10 : wordCount >= 20 ? 6 : 0) +
        (matchedKeywords.length >= 3 ? 15 : 0) +
        (titleStrength >= 70 ? 15 : 0)
      ),
      weight: 10,
      detail: `${wordCount} words extracted; checks include contact email, standard section headings, and readable text volume.`
    },
    {
      id: "impact",
      label: "Evidence of impact",
      score: clampScore(metricLines.length >= 3 ? 100 : metricLines.length === 2 ? 80 : metricLines.length === 1 ? 70 : 30),
      weight: 5,
      detail: `${metricLines.length} lines with recognizable numeric outcomes or scale were detected.`
    }
  ];

  const applicableDimensions = dimensions.filter((dimension) => dimension.score !== null);
  const activeWeight = applicableDimensions.reduce((total, dimension) => total + dimension.weight, 0);
  const baseScore = jobTerms.length
    ? clampScore(applicableDimensions.reduce((total, dimension) => total + (dimension.score ?? 0) * dimension.weight, 0) / activeWeight)
    : 0;
  const titleScore = dimensions.find((dimension) => dimension.id === "title")?.score ?? 0;
  const experienceScore = dimensions.find((dimension) => dimension.id === "experience")?.score ?? 0;
  const roleFitBonus =
    titleScore >= 85 && experienceScore >= 65 && jobExperienceYears > 0 && resumeExperienceYears >= Math.max(1, jobExperienceYears * 0.7)
      ? 12
      : titleScore >= 75 && experienceScore >= 60
        ? 8
        : 0;
  const score = clampScore(baseScore + roleFitBonus);
  const missingSections = [
    ["experience", experienceSection.found],
    ["education", educationSection.found],
    ["skills", skillsSection.found]
  ].filter(([, found]) => !found).map(([name]) => name as string);
  const recommendations = jobTerms.length
    ? buildRecommendations({ missingKeywords, dimensions, missingSections, missingEducation })
    : [{
      id: "complete-job-description",
      text: "Paste a complete job description with responsibilities and qualifications to produce a meaningful comparison.",
      draftText: ""
    }];

  return {
    score,
    dimensions,
    matchedKeywords,
    matchedEvidence,
    missingKeywords,
    requiredGaps,
    totalKeywords: jobTerms.length,
    recommendations,
    isAnalyzable: jobTerms.length > 0
  };
}

export type AtsAnalysis = ReturnType<typeof calculateAtsScore>;

export function generateResumeSuggestions(resumeText: string, jobDescription: string) {
  return calculateAtsScore(resumeText, jobDescription).recommendations.map((recommendation) => recommendation.text);
}
