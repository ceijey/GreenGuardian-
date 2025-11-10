'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import styles from './quizzes.module.css';
const QUESTIONS = [
  { id: 1, q: 'Which practice reduces food waste most effectively?', options: ['Meal planning and composting', 'Buying in bulk only', 'Using plastic wrap for leftovers'], answer: 0 },
  { id: 2, q: 'Which transport choice has the smallest carbon footprint per passenger-mile?', options: ['Private car (solo)', 'Bus or coach', 'Small motorcycle'], answer: 1 },
  { id: 3, q: 'Which of these is a renewable energy source?', options: ['Coal', 'Wind', 'Natural gas'], answer: 1 },
  { id: 4, q: 'What does “biodegradable” mean?', options: ['Will break down naturally', 'Is recyclable', 'Is non-toxic'], answer: 0 },
  { id: 5, q: 'Which action helps conserve water?', options: ['Fixing leaks', 'Washing car with hose running', 'Keeping sprinklers on all night'], answer: 0 },
  { id: 6, q: 'Why plant native species in gardens?', options: ['Require more fertilizer', 'Support local wildlife', 'Replace local ecosystems'], answer: 1 },
  { id: 7, q: 'Which material is easiest to recycle widely?', options: ['Glass', 'Styrofoam', 'Composite plastics'], answer: 0 },
  { id: 8, q: 'Which farming practice improves soil health?', options: ['Monocropping only', 'Crop rotation', 'Excessive tilling'], answer: 1 },
  { id: 9, q: 'What is a major benefit of trees in cities?', options: ['Increase urban temperature', 'Reduce heat island effect', 'Reduce oxygen'], answer: 1 },
  { id: 10, q: 'How can you reduce energy use at home?', options: ['Turn off lights when not needed', 'Keep all lights on 24/7', 'Use incandescent bulbs'], answer: 0 },
  { id: 11, q: 'Which packaging choice is typically best for reducing waste?', options: ['Single-use plastics', 'Refillable containers', 'Over-packaged goods'], answer: 1 },
  { id: 12, q: 'What does “carbon neutrality” mean?', options: ['Emitting zero CO2', 'Balancing emissions with removals', 'Banning fossil fuels immediately'], answer: 1 },
  { id: 13, q: 'Which is an example of a circular economy action?', options: ['Throwing electronics away', 'Repairing and reusing products', 'Using single-use items'], answer: 1 },
  { id: 14, q: 'What is one way to help biodiversity locally?', options: ['Removing hedgerows', 'Creating wildlife-friendly gardens', 'Using lots of pesticides'], answer: 1 },
  { id: 15, q: 'Which diet change tends to lower environmental impact?', options: ['Eating more processed meat', 'Reducing meat consumption', 'Eating imported, out-of-season produce only'], answer: 1 },
  { id: 16, q: 'What is the biggest contributor to plastic pollution?', options: ['Large ships only', 'Single-use plastics and improper disposal', 'Home composting'], answer: 1 },
  { id: 17, q: 'Which behavior reduces personal transport emissions?', options: ['Carpooling and public transport', 'Driving alone more often', 'Idling the engine'], answer: 0 },
  { id: 18, q: 'Which action helps coastal protection?', options: ['Restoring mangroves', 'Removing native plants', 'Expanding concrete seawalls only'], answer: 0 },
  { id: 19, q: 'What is an effective way to reduce electronic waste?', options: ['Buy the cheapest electronics', 'Repair and upgrade devices', 'Replace devices yearly'], answer: 1 },
  { id: 20, q: 'Which statement about LED bulbs is true?', options: ['Use more energy than incandescent', 'Are more efficient and last longer', 'Cannot be recycled'], answer: 1 },
];

export default function QuizzesPage() {
  // shuffle helper
  const shuffleArray = <T,>(arr: T[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const [questions, setQuestions] = useState(() => shuffleArray(QUESTIONS));
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [submitted, setSubmitted] = useState(false);

  const select = (qid: number, idx: number) => {
    setAnswers((s) => ({ ...s, [qid]: idx }));
  };

  const score = () => {
    let s = 0;
    for (const q of questions) {
      if (answers[q.id] === q.answer) s++;
    }
    return s;
  };

  const resetAll = () => {
    setAnswers({});
    setSubmitted(false);
    setQuestions(shuffleArray(QUESTIONS));
    // small scroll to top of quiz
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <>
      <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
      <main className={`main-content container ${styles.container}`}>
        <div className="card">
          <div className={styles.header}>
            <h1>Quick Quiz</h1>
            <div className={styles.answerCount}>Answered: {answeredCount} / {questions.length}</div>
          </div>

          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
          </div>

          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            {questions.map((q, qi) => (
              <fieldset key={q.id} className={`card ${styles.fieldset}`}>
                <legend className={styles.legend}>{qi + 1}. {q.q}</legend>
                <div className={styles.optionsContainer}>
                  {q.options.map((opt, idx) => {
                    const inputId = `q-${q.id}-opt-${idx}`;
                    return (
                      <label key={idx} htmlFor={inputId} className={styles.optionLabel}>
                        <input
                          id={inputId}
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[q.id] === idx}
                          onChange={() => select(q.id, idx)}
                          required
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>

                {submitted && (
                  <p className={`${styles.feedback} ${answers[q.id] === q.answer ? styles.correct : styles.incorrect}`}>
                    {answers[q.id] === q.answer ? (
                      <>Correct</>
                    ) : (
                      <>Incorrect — correct: {q.options[q.answer]}</>
                    )}
                  </p>
                )}
              </fieldset>
            ))}

            <div className={styles.actions}>
              <button className="btn btn-primary" type="submit">Submit</button>
              <button type="button" className="btn btn-secondary" onClick={resetAll}>Reset & Shuffle</button>
              {submitted && (
                <div className={styles.score}>Your score: <strong>{score()}</strong> / {questions.length}</div>
              )}
            </div>
          </form>

          <div className={styles.footer}>
            <Link href="/resources" className="btn btn-secondary">Back to resources</Link>
          </div>
        </div>
      </main>
    </>
  );
}
