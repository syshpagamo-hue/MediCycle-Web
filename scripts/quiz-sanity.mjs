import assert from 'node:assert/strict'
import { quizQuestions } from '../src/data.ts'

assert.equal(quizQuestions.length, 6)

for (const question of quizQuestions) {
  assert.equal(question.options.length, 4, `${question.id}: expected four options`)
  assert.ok(question.options.some((option) => option.id === question.correctOptionId))
  assert.ok(question.explanation.en.correct.length >= 80, `${question.id}: English explanation is too short`)
  assert.ok(question.explanation['zh-TW'].correct.length >= 35, `${question.id}: Chinese explanation is too short`)
  for (const language of ['en', 'zh-TW']) {
    for (const option of question.options) {
      if (option.id === question.correctOptionId) continue
      assert.ok(question.explanation[language].incorrect[option.id], `${question.id}: missing ${language} explanation for ${option.id}`)
    }
  }
  assert.ok(question.sources.length >= 1 && question.sources.length <= 2)
  for (const source of question.sources) {
    assert.ok(source.organization && source.title && source.href)
    assert.match(source.href, /^https:\/\//)
  }
}

const ee2Sources = quizQuestions.find((question) => question.id === 'ee2-marine-fish-impact')?.sources ?? []
assert.ok(ee2Sources.some((source) => source.href.includes('pubmed.ncbi.nlm.nih.gov')))
const disposalSources = quizQuestions.find((question) => question.id === 'hormone-medication-disposal')?.sources ?? []
assert.ok(disposalSources.some((source) => source.href.includes('fda.gov')))

console.log('Quiz sanity checks passed: six bilingual explanations with option rationales and supporting sources.')
