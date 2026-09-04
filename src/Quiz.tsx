import { useRef, useState } from 'react'
import { quizQuestions, type QuizOption } from './data'
import type { QuizProgress } from '../shared/progress'
import { useI18n } from './i18n'

const zhQuizCopy = [
  ['炔雌醇（EE2）進入水域後，可能對魚類造成什麼影響？', '可能使雄魚雌性化，干擾生殖發育與行為、降低繁殖成功率，長期嚴重暴露甚至造成族群下降。', '使魚類異常巨大。', '立刻損傷魚鰓並造成窒息。', '改變魚鱗顏色以躲避掠食者。'],
  ['人類使用的藥物主要如何進入水域並影響海洋生物？', '工廠直接排放高溫廢氣', '船隻將塑膠垃圾傾倒入海', '人體排泄、家庭廢水與不當丟棄藥物', '海底火山釋放化學物質'],
  ['為什麼正確處理藥物很重要？', '有助預防藥物污染並保護水域生態系。', '會改變藥物顏色。', '會讓藥物更便宜。', '會增加塑膠回收量。'],
  ['未使用的荷爾蒙藥物通常應如何處理？', '直接丟入一般垃圾', '沖入馬桶', '交給核准的藥物回收或收集計畫', '放入家用資源回收桶'],
  ['為什麼藥物污染可能傷害水生動物？', '藥物具有生物活性，可能影響繁殖、發育、生理或行為。', '一定會使海水升溫。', '會增加水中氧氣。', '會把藥物變成微塑膠。'],
  ['AI 在 MediCycle 中能協助什麼？', '分析影像以協助辨識藥物。', '生產藥物', '運送藥物', '販售藥物'],
] as const

export function Quiz({
  savedResult,
  onComplete,
}: {
  savedResult: QuizProgress
  onComplete: (score: number, total: number) => void
}) {
  const { t, language } = useI18n()
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState<QuizOption['id'] | null>(null)
  const [score, setScore] = useState(savedResult.bestScore)
  const [isComplete, setIsComplete] = useState(savedResult.completed)
  const quizCardRef = useRef<HTMLDivElement>(null)

  const baseQuestion = quizQuestions[questionIndex]
  const localized = zhQuizCopy[questionIndex]
  const question = language === 'zh-TW' ? { ...baseQuestion, question: localized[0], options: baseQuestion.options.map((option, index) => ({ ...option, text: localized[index + 1] })) } : baseQuestion
  const isCorrect = selectedOptionId === question.correctOptionId
  const percentage = Math.round((score / quizQuestions.length) * 100)

  const selectOption = (optionId: QuizOption['id']) => {
    if (selectedOptionId) return
    setSelectedOptionId(optionId)
    if (optionId === question.correctOptionId) setScore((currentScore) => currentScore + 1)
  }

  const nextQuestion = () => {
    if (!selectedOptionId) return
    if (questionIndex === quizQuestions.length - 1) {
      setIsComplete(true)
      onComplete(score, quizQuestions.length)
    } else {
      setQuestionIndex((currentIndex) => currentIndex + 1)
      setSelectedOptionId(null)
    }
    window.requestAnimationFrame(() => quizCardRef.current?.focus())
  }

  const restartQuiz = () => {
    setQuestionIndex(0)
    setSelectedOptionId(null)
    setScore(0)
    setIsComplete(false)
    window.requestAnimationFrame(() => quizCardRef.current?.focus())
  }

  return (
    <section className="knowledge-check" id="impact-check" aria-labelledby="quiz-title">
      <div className="knowledge-intro">
        <p className="eyebrow">{t('quizEyebrow')}</p>
        <h2 id="quiz-title">{t('quizTitle')}</h2>
        <p>{t('quizIntro')}</p>
        <div className="theory-note">
          <b>NAM · Awareness of Consequences</b>
          <span>Understanding impact can activate a personal norm for pro-environmental action.</span>
        </div>
      </div>

      <div className="quiz-card" ref={quizCardRef} tabIndex={-1}>
        {isComplete ? (
          <div className="quiz-results" aria-live="polite">
            <p className="quiz-kicker">{t('quizComplete')}</p>
            <div className="quiz-score"><strong>{score} / {quizQuestions.length}</strong><span>{percentage}%</span></div>
            <h3>{score === quizQuestions.length ? t('quizPerfect') : t('quizTryAgain')}</h3>
            <p>{score === quizQuestions.length ? t('quizPerfectText') : t('quizTryAgainText')}</p>
            <button className="figma-button black" type="button" onClick={restartQuiz}>{t('restartQuiz')}</button>
          </div>
        ) : (
          <>
            <div className="quiz-progress" aria-label={t('questionAria', { current: questionIndex + 1, total: quizQuestions.length })}>
              <div><span>{t('question')} {String(questionIndex + 1).padStart(2, '0')}</span><b>{questionIndex + 1} / {quizQuestions.length}</b></div>
              <i><span style={{ width: `${((questionIndex + 1) / quizQuestions.length) * 100}%` }} /></i>
            </div>
            <fieldset className="quiz-question">
              <legend>{question.question}</legend>
              <div className="quiz-options">
                {question.options.map((option) => {
                  const isSelected = selectedOptionId === option.id
                  const showCorrect = Boolean(selectedOptionId) && option.id === question.correctOptionId
                  const showIncorrect = isSelected && !isCorrect
                  return (
                    <label
                      className={`${isSelected ? 'is-selected' : ''}${showCorrect ? ' is-correct' : ''}${showIncorrect ? ' is-incorrect' : ''}`}
                      key={option.id}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.id}
                        checked={isSelected}
                        disabled={Boolean(selectedOptionId)}
                        onChange={() => selectOption(option.id)}
                      />
                      <span className="option-letter" aria-hidden="true">{option.id}</span>
                      <span>{option.text}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <div className="quiz-action-row">
              <div className={`quiz-feedback${selectedOptionId ? (isCorrect ? ' is-correct' : ' is-incorrect') : ''}`} aria-live="polite">
                {selectedOptionId && <b>{isCorrect ? t('correct') : t('incorrect')}</b>}
              </div>
              {selectedOptionId && (
                <button className="figma-button black" type="button" onClick={nextQuestion}>
                  {questionIndex === quizQuestions.length - 1 ? t('viewResults') : t('nextQuestion')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
