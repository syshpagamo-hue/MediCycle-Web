import { useRef, useState } from 'react'
import { quizQuestions, type QuizOption } from './data'

export function Quiz() {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState<QuizOption['id'] | null>(null)
  const [score, setScore] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const quizCardRef = useRef<HTMLDivElement>(null)

  const question = quizQuestions[questionIndex]
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
        <p className="eyebrow">STEP 04 · EMPATHY-BASED LEARNING</p>
        <h2 id="quiz-title">Turn awareness into knowledge.</h2>
        <p>Test what you learned about medication disposal, AI identification, and the ocean impact of pharmaceutical pollution.</p>
        <div className="theory-note">
          <b>NAM · Awareness of Consequences</b>
          <span>Understanding impact can activate a personal norm for pro-environmental action.</span>
        </div>
      </div>

      <div className="quiz-card" ref={quizCardRef} tabIndex={-1}>
        {isComplete ? (
          <div className="quiz-results" aria-live="polite">
            <p className="quiz-kicker">QUIZ COMPLETE</p>
            <div className="quiz-score"><strong>{score} / {quizQuestions.length}</strong><span>{percentage}%</span></div>
            <h3>{score === quizQuestions.length ? 'Ocean knowledge activated.' : 'Every answer is a step toward safer water.'}</h3>
            <p>{score === quizQuestions.length ? 'You connected responsible medication disposal with healthier marine ecosystems.' : 'Restart the quiz to review the questions and strengthen what you learned.'}</p>
            <button className="figma-button black" type="button" onClick={restartQuiz}>RESTART QUIZ</button>
          </div>
        ) : (
          <>
            <div className="quiz-progress" aria-label={`Question ${questionIndex + 1} of ${quizQuestions.length}`}>
              <div><span>QUESTION {String(questionIndex + 1).padStart(2, '0')}</span><b>{questionIndex + 1} / {quizQuestions.length}</b></div>
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
                {selectedOptionId && <b>{isCorrect ? 'Correct.' : 'Incorrect.'}</b>}
              </div>
              {selectedOptionId && (
                <button className="figma-button black" type="button" onClick={nextQuestion}>
                  {questionIndex === quizQuestions.length - 1 ? 'VIEW RESULTS' : 'NEXT QUESTION'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
