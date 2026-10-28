const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "he",
  "her",
  "his",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "their",
  "them",
  "they",
  "this",
  "to",
  "us",
  "was",
  "we",
  "with",
  "you",
  "your",
  "will",
  "work",
  "team",
  "role",
  "responsibilities",
  "using",
  "through",
  "about",
  "into",
  "within",
  "across",
  "over",
  "more",
  "most",
  "need",
  "needed",
  "strong",
  "skills",
  "experience",
  "years",
  "year",
  "job",
  "candidate"
]);

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywordCandidates(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const tokens = normalized.split(" ").filter((token) => token.length > 2);
  const keywords = new Map<string, number>();

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (STOP_WORDS.has(token)) continue;

    keywords.set(token, (keywords.get(token) ?? 0) + 1);

    if (index < tokens.length - 1) {
      const phrase = `${tokens[index]} ${tokens[index + 1]}`;
      const trimmed = phrase
        .split(" ")
        .filter((word) => !STOP_WORDS.has(word) && word.length > 2)
        .join(" ");

      if (trimmed.includes(" ")) {
        keywords.set(trimmed, (keywords.get(trimmed) ?? 0) + 1);
      }
    }
  }

  return [...keywords.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([keyword]) => keyword)
    .slice(0, 12);
}

function toKeywordSet(text: string) {
  const keywords = extractKeywordCandidates(text);
  return new Set(keywords);
}

export function calculateAtsScore(resumeText: string, jobDescription: string) {
  const jobKeywords = extractKeywordCandidates(jobDescription);
  const resumeKeywords = toKeywordSet(resumeText);

  if (!jobKeywords.length) {
    return {
      score: 0,
      matchedKeywords: [],
      missingKeywords: [],
      totalKeywords: 0
    };
  }

  const matchedKeywords = jobKeywords.filter((keyword) => {
    if (!keyword) return false;
    return Array.from(resumeKeywords).some((resumeKeyword) => {
      if (keyword === resumeKeyword) return true;
      return resumeKeyword.includes(keyword) || keyword.includes(resumeKeyword);
    });
  });

  const missingKeywords = jobKeywords.filter(
    (keyword) => !matchedKeywords.includes(keyword)
  );

  const score = Math.min(
    98,
    Math.max(35, Math.round((matchedKeywords.length / jobKeywords.length) * 100))
  );

  return {
    score,
    matchedKeywords,
    missingKeywords,
    totalKeywords: jobKeywords.length
  };
}

export function generateResumeSuggestions(resumeText: string, jobDescription: string) {
  const jobKeywords = extractKeywordCandidates(jobDescription);
  const normalizedResume = normalizeText(resumeText);

  const suggestions: string[] = [];
  const keywordMap: Record<string, string> = {
    leadership: "Add leadership examples that show team ownership, decision-making, and cross-functional influence.",
    "stakeholder management": "Highlight stakeholder management experience with clients, partners, and internal teams to show relationship ownership.",
    agile: "Include agile experience such as sprint planning, backlog ownership, standups, and iterative delivery outcomes.",
    analytics: "Add measurable analytics wins, such as KPI improvements, reporting, experimentation, or forecasting impact.",
    strategy: "Show strategic thinking by including roadmap planning, market research, prioritization, and business impact examples.",
    product: "Mention product ownership, user research, prioritization, and end-to-end delivery of initiatives.",
    communication: "Strengthen communication skills with examples of presentations, cross-functional alignment, and stakeholder updates.",
    management: "Describe team leadership, project management, planning, and operational ownership in your bullet points.",
    experience: "Add concrete accomplishments and responsibilities so the resume shows direct experience rather than generic statements."
  };

  for (const keyword of jobKeywords) {
    const lowerKeyword = keyword.toLowerCase();
    if (normalizedResume.includes(lowerKeyword)) continue;

    const suggestion =
      keywordMap[lowerKeyword] ||
      `Add the keyword "${keyword}" in your experience bullets with a clear example of ownership, impact, and results.`;

    suggestions.push(suggestion);
  }

  if (!suggestions.length) {
    suggestions.push(
      "Your resume already aligns closely with the job description. Consider adding 2-3 measurable impact metrics for stronger ATS performance."
    );
  }

  if (suggestions.length < 3) {
    suggestions.push(
      "Add 2-3 quantified achievements with metrics such as revenue growth, efficiency gains, or customer impact to improve ATS and recruiter relevance."
    );
  }

  return suggestions.slice(0, 5);
}
