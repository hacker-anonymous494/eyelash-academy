import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/config/supabase';
import { getSignedVideoUrl } from '@/lib/supabaseStorage';
import GlassCard from '@/shared/components/GlassCard';
import PrimaryButton from '@/shared/components/PrimaryButton';
import QuizPanel from './QuizPanel';
import { motion, AnimatePresence } from 'framer-motion';

export default function LessonWorkspace({
  lesson,
  courseId,
  userId,
  onQuizSubmitted,  // ✅ prop name fixed to match LearnPage
}) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoReady, setVideoReady] = useState(false);  // ✅ new state for video element existence
  const [videoWatched, setVideoWatched] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizTaken, setQuizTaken] = useState(false);
  const [progress, setProgress] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const videoRef = useRef(null);
  const intervalRef = useRef(null);

  // Helper: save video progress to Supabase
// Inside LessonWorkspace – the saveProgress callback
const saveProgress = useCallback(async () => {
  if (!videoRef.current || videoRef.current.paused || !userId || !lesson.id) return;

  const currentTime = Math.floor(videoRef.current.currentTime);
  const videoDuration = videoRef.current.duration; // used only locally
  const isCompleted = videoDuration > 0 && currentTime / videoDuration >= 0.95;

  try {
    await supabase
      .from('lesson_progress')
      .upsert(
        {
          student_id: userId,
          lesson_id: lesson.id,
          last_watched_seconds: currentTime,
          // ✅ NO duration here – it doesn't exist in the table
        },
        { onConflict: 'student_id,lesson_id' }
      );

    if (isCompleted && !videoWatched) {
      setVideoWatched(true);
    }
  } catch (error) {
    console.error('Failed to save video progress:', error);
  }
}, [userId, lesson.id, videoWatched]);
  // Start / stop the save interval based on videoReady
  useEffect(() => {
    if (!videoReady) return;  // don't start until video element exists

    intervalRef.current = setInterval(saveProgress, 5000);
    return () => clearInterval(intervalRef.current);
  }, [videoReady, saveProgress]);

  // Fetch signed video URL
  useEffect(() => {
    async function loadVideo() {
      setVideoLoading(true);
      if (lesson.video_url) {
        const signedUrl = await getSignedVideoUrl(lesson.video_url);
        setVideoUrl(signedUrl);
      }
      setVideoLoading(false);
    }
    loadVideo();
  }, [lesson]);

  // Fetch existing progress (quiz, video completion)
  useEffect(() => {
    async function fetchProgress() {
      const { data } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('student_id', userId)
        .eq('lesson_id', lesson.id)
        .maybeSingle();
      if (data) {
        setProgress(data);
        setVideoWatched(
          data.last_watched_seconds > 0 &&
          data.last_watched_seconds / (data.duration || 1) > 0.9
        );
        setQuizTaken(data.quiz_attempts && data.quiz_attempts.length > 0);
      }
    }
    if (userId && lesson) fetchProgress();
  }, [userId, lesson]);

  const handleTakeQuiz = () => {
    if (quizTaken) {
      setShowQuiz(true);  // view previous quiz (read only)
    } else {
      setShowWarning(true);
    }
  };

  const confirmTakeQuiz = () => {
    setShowWarning(false);
    setShowQuiz(true);
  };

  const handleQuizPassed = () => {
    setQuizTaken(true);
    setShowQuiz(false);
    if (onQuizSubmitted) {
      onQuizSubmitted(); // ✅ triggers refresh in LearnPage
    }
  };

  const tabs = [
    { key: 'summary', label: 'Summary', icon: '📋' },
    { key: 'tasks', label: 'Tasks', icon: '✅' },
    { key: 'links', label: 'Resources', icon: '🔗' },
  ];

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Main content area */}
        <div className="lg:col-span-2 flex flex-col space-y-4 overflow-y-auto">
          <GlassCard className="p-0 overflow-hidden rounded-xl">
            <div className="aspect-video bg-black relative">
              {videoLoading ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-rose-200 border-t-brand-rose-600" />
                </div>
              ) : videoUrl ? (
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    setVideoReady(!!el);   // ✅ signal that the video element is mounted
                  }}
                  src={videoUrl}
                  controls
                  className="w-full h-full"
                  onError={() => setVideoUrl(null)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  No video available for this lesson.
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="flex-1 p-6">
            <div className="flex border-b border-brand-rose-200/40 mb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    activeTab === tab.key
                      ? 'border-b-2 border-brand-rose-500 text-brand-rose-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
            <div className="prose prose-sm max-w-none">
              {activeTab === 'summary' && (
                <div>
                  {lesson.summary ? (
                    <p className="text-gray-700 leading-relaxed">{lesson.summary}</p>
                  ) : (
                    <p className="text-gray-400 italic">No summary provided for this lesson.</p>
                  )}
                </div>
              )}
              {activeTab === 'tasks' && (
                <div>
                  {lesson.tasks && lesson.tasks.length > 0 ? (
                    <ul className="space-y-2">
                      {lesson.tasks.map((task, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <span className="text-brand-rose-500 mt-1">•</span>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 italic">No tasks for this lesson.</p>
                  )}
                </div>
              )}
              {activeTab === 'links' && (
                <div>
                  {lesson.helpful_links && lesson.helpful_links.length > 0 ? (
                    <ul className="space-y-2">
                      {lesson.helpful_links.map((link, idx) => {
                        const url = typeof link === 'string' ? link : link?.url;
                        const label =
                          typeof link === 'string' ? link : link?.label || link?.url || 'Resource';
                        return (
                          <li key={idx}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-rose-600 hover:underline text-sm"
                            >
                              {label}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-gray-400 italic">No additional resources.</p>
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Sidebar – Quiz & Progress */}
        <div className="flex flex-col space-y-4">
          <GlassCard className="p-4">
            <h3 className="font-semibold text-lg mb-3">Lesson Progress</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Video</span>
                <span className={videoWatched ? 'text-green-500' : 'text-gray-400'}>
                  {videoWatched ? '✓ Watched' : 'Not yet'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Quiz</span>
                <span className={quizTaken ? 'text-green-500' : 'text-gray-400'}>
                  {quizTaken ? '✓ Taken' : 'Not taken'}
                </span>
              </div>
            </div>
          </GlassCard>

          <div className="flex flex-col gap-2">
            {!quizTaken && (
              <PrimaryButton onClick={handleTakeQuiz}>
                {videoWatched ? 'Take the Quiz' : 'Watch Video First'}
              </PrimaryButton>
            )}
            {quizTaken && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center">
                ✅ Quiz completed
              </div>
            )}
            {showQuiz && (
              <div className="mt-4">
                <QuizPanel
                  lessonId={lesson.id}
                  userId={userId}
                  onQuizPassed={handleQuizPassed}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warning Modal (unchanged) */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowWarning(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-xl border border-brand-rose-200/40"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-4xl mb-4 text-center">⚠️</div>
              <h3 className="text-xl font-display font-semibold mb-2 text-center">
                Important: Read Before Taking the Quiz
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                This quiz is designed to test your understanding of the lesson. You can only take it{' '}
                <strong>once</strong>. Your score will be logged and contributes to your overall grade.
                Make sure you have watched the video and reviewed the summary before proceeding.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowWarning(false)} className="btn-ghost flex-1">
                  Cancel
                </button>
                <PrimaryButton onClick={confirmTakeQuiz} className="flex-1">
                  I'm Ready – Take Quiz
                </PrimaryButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}