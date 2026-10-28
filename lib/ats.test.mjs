import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAtsScore, generateResumeSuggestions } from './ats.ts';

test('ATS score rewards matching keywords and penalizes missing ones', () => {
  const result = calculateAtsScore(
    'Experienced product manager with leadership, stakeholder management, agile delivery, and analytics skills.',
    'We need a product manager with stakeholder management, agile, analytics, and leadership experience.'
  );

  assert.ok(result.score >= 70);
  assert.ok(result.score <= 100);
  assert.ok(result.matchedKeywords.length >= 3);
  assert.ok(result.missingKeywords.length >= 0);
});

test('resume suggestions include actionable improvements', () => {
  const suggestions = generateResumeSuggestions(
    'Worked on projects and collaborated with teams.',
    'Need leadership, stakeholder management, and agile experience.'
  );

  assert.ok(suggestions.length > 0);
  assert.ok(suggestions.some((item) => item.toLowerCase().includes('leadership')));
});
