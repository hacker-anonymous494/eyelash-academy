import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';
import PrimaryButton from '@/shared/components/PrimaryButton';
import GlassCard from '@/shared/components/GlassCard';

export default function QuizPanel({ lessonId, userId, onQuizPassed }) {
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [passed, setPassed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [lastAttemptDate, setLastAttemptDate] = useState(null);

  // Fetch quiz and questions
  useEffect(() => {
    async function fetchQuiz() {
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*, quiz_questions(*)')
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (quizData) {
        setQuiz(quizData);
        setQuestions(quizData.quiz_questions || []);

        // Check existing progress for attempts
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('quiz_attempts, passed_quiz')
          .eq('student_id', userId)
          .eq('lesson_id', lessonId)
          .maybeSingle();

        if (progress) {
          const attempts = progress.quiz_attempts || [];
          setAttempts(attempts.length);
          setLastAttemptDate(attempts.length > 0 ? attempts[attempts.length - 1].date : null);
          if (progress.passed_quiz) {
            setPassed(true);
            setSubmitted(true);
          }
        }
      }
      setLoading(false);
    }
    fetchQuiz();
  }, [lessonId, userId]);

  const handleAnswerChange = (questionId, optionIndex) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (submitted) return;

    // Calculate score
    let correct = 0;
    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correct_option_index) correct++;
    });
    const percentage = Math.round((correct / questions.length) * 100);
    const hasPassed = percentage >= (quiz.pass_percentage || 70);

    // Update lesson_progress
    const newAttempt = {
      date: new Date().toISOString(),
      score: percentage,
      answers: userAnswers,
    };

    const { data: currentProgress } = await supabase
      .from('lesson_progress')
      .select('quiz_attempts')
      .eq('student_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    const existingAttempts = currentProgress?.quiz_attempts || [];
    const updatedAttempts = [...existingAttempts, newAttempt];

    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        student_id: userId,
        lesson_id: lessonId,
        quiz_attempts: updatedAttempts,
        passed_quiz: hasPassed,
        completed: hasPassed,
        completed_at: hasPassed ? new Date().toISOString() : null,
      }, { onConflict: 'student_id,lesson_id' });

    if (!error) {
      setScore(percentage);
      setPassed(hasPassed);
      setSubmitted(true);
      setAttempts(updatedAttempts.length);
      setLastAttemptDate(newAttempt.date);

      // ✅ Notify parent that quiz was taken (even if failed)
      if (onQuizPassed) {
        onQuizPassed();
      }
    }
  };

  if (loading) return <div className="text-center py-4">Loading quiz...</div>;
  if (!quiz) return null; // No quiz for this lesson

  if (passed) {
    return (
      <GlassCard className="p-4 mt-4 bg-green-50/80 border-green-200">
        <p className="text-green-700 font-semibold">✅ Quiz Passed</p>
        <p className="text-sm text-green-600">
          Score: {score}% | Attempts: {attempts} | Last: {new Date(lastAttemptDate).toLocaleDateString()}
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4 mt-4">
      <h3 className="font-display font-semibold text-lg mb-2">Lesson Quiz</h3>
      <p className="text-sm text-gray-600 mb-4">
        Answer all questions correctly to complete this lesson. You can retake after reviewing the video, but multiple attempts may affect your final standing.
      </p>

      {submitted && !passed && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          You scored {score}%. Need {quiz.pass_percentage}% to pass. Please review the lesson and try again.
        </div>
      )}

      {questions.map((q) => (
        <div key={q.id} className="mb-4">
          <p className="font-medium mb-2">{q.question_text}</p>
          <div className="space-y-2">
            {q.options.map((opt, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name={`q_${q.id}`}
                  checked={userAnswers[q.id] === idx}
                  onChange={() => handleAnswerChange(q.id, idx)}
                  disabled={submitted}
                  className="accent-brand-rose-600"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}

      <PrimaryButton onClick={handleSubmit} loading={submitted} disabled={submitted}>
        Submit Answers
      </PrimaryButton>
    </GlassCard>
  );
}