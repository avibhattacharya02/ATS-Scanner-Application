import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAtsScore, generateResumeSuggestions } from './ats.ts';

test('ATS score returns a transparent weighted breakdown and exact matches', () => {
  const result = calculateAtsScore(
    'Experience\nProduct Manager — led stakeholder management, agile delivery, and analytics. Improved conversion by 18%.\nEducation\nBachelor degree\nSkills\nAgile, analytics',
    'Product Manager\nRequired: stakeholder management, agile, analytics, and leadership experience. Bachelor degree preferred.'
  );

  assert.ok(result.score >= 0 && result.score <= 100);
  assert.equal(result.isAnalyzable, true);
  assert.ok(result.dimensions.some((dimension) => dimension.id === 'skills' && dimension.score !== null));
  assert.ok(result.matchedKeywords.includes('agile'));
  assert.match(result.matchedEvidence.find((item) => item.term === 'agile').snippet, /agile/i);
  assert.ok(result.requiredGaps.includes('leadership'));
  assert.ok(result.recommendations.length > 0);
});

test('ATS matching recognizes aliases without substring false positives', () => {
  const result = calculateAtsScore(
    'Experience\nUsed JavaScript and AWS on production projects.\nEducation\nBachelor degree\nSkills\nJavaScript',
    'Frontend Developer\nRequired: Java and AWS. Bachelor degree required.'
  );

  assert.ok(result.matchedKeywords.includes('aws'));
  assert.ok(!result.matchedKeywords.includes('java'));
  assert.ok(result.requiredGaps.includes('java'));
});

test('seniority and experience weighting reflect realistic role fit', () => {
  const result = calculateAtsScore(
    'Senior Product Manager with 8 years leading cross-functional teams and delivering product strategy.\nBachelor degree.',
    'Senior Product Manager with 7+ years of experience in product strategy, stakeholder management, and cross-functional leadership.'
  );

  assert.ok(result.score >= 75);
  assert.ok(result.dimensions.some((dimension) => dimension.id === 'title' && (dimension.score ?? 0) >= 70));
  assert.ok(result.recommendations.length > 0);
});

test('resume suggestions include actionable improvements', () => {
  const suggestions = generateResumeSuggestions(
    'Worked on projects and collaborated with teams.',
    'Need leadership, stakeholder management, and agile experience.'
  );

  assert.ok(suggestions.length > 0);
  assert.ok(suggestions.some((item) => item.toLowerCase().includes('leadership')));
});
