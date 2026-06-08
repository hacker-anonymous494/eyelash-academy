import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/config/supabase';
import { getSignedVideoUrl } from '@/lib/supabaseStorage';
import GlassCard from '@/shared/components/GlassCard';
import QuizPanel from './QuizPanel'; // your existing QuizPanel

export default function LessonPlayer({ lesson, courseId, userId, onProgressUpdate }) {
  const [progress, setProgress] = useState({ last_watched_seconds: 0, completed: false, passed_quiz: false });
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [certificateUrl, setCertificateUrl] = useState(null);
  const [certLoading, setCertLoading] = useState(false);
  const [celebration, setCelebration] = useState(false);
  const videoRef = useRef(null);
  const progressInterval = useRef(null);

  // 1. Fetch signed video URL
  useEffect(() => {
    async function loadVideo() {
      setVideoLoading(true);
      try {
        if (lesson?.video_url) {
          const signedUrl = await getSignedVideoUrl(lesson.video_url);
          setVideoUrl(signedUrl);
        } else {
          setVideoUrl(null);
        }
      } catch (err) {
        console.error('Failed to load signed video URL:', err);
        setVideoUrl(null);
      } finally {
        setVideoLoading(false);
      }
    }
    loadVideo();
  }, [lesson]);

  // 2. Fetch progress (including passed_quiz)
  useEffect(() => {
    async function initProgress() {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('student_id', userId)
        .eq('lesson_id', lesson.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch progress:', error);
        return;
      }

      if (data) {
        setProgress({
          last_watched_seconds: data.last_watched_seconds,
          completed: data.completed,
          passed_quiz: data.passed_quiz || false,
        });
        // If quiz already passed, don't show it
        if (!data.passed_quiz && data.completed) {
          setShowQuiz(true);
        }
      } else {
        const { error: upsertError } = await supabase
          .from('lesson_progress')
          .upsert({
            student_id: userId,
            lesson_id: lesson.id,
            last_watched_seconds: 0,
            completed: false,
            passed_quiz: false,
          }, { onConflict: 'student_id,lesson_id' });
        if (upsertError) console.error('Failed to create progress:', upsertError);
      }
    }
    if (userId && lesson) initProgress();
  }, [userId, lesson]);

  // 3. Check all lessons completed (for certificate)
  const checkAllLessonsCompleted = useCallback(async () => {
    const { data: modules } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', courseId);
    if (!modules || modules.length === 0) return false;
    const moduleIds = modules.map(m => m.id);

    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds);
    if (!lessons || lessons.length === 0) return false;
    const lessonIds = lessons.map(l => l.id);

    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('passed_quiz')
      .eq('student_id', userId)
      .in('lesson_id', lessonIds);

    if (!progressData || progressData.length !== lessonIds.length) return false;
    return progressData.every(p => p.passed_quiz === true);
  }, [courseId, userId]);

  // 4. Generate certificate (handles 404 gracefully)
  const generateCertificate = useCallback(async () => {
    if (certLoading || certificateUrl) return;
    setCertLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/.netlify/functions/generate-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ courseId }),
      });
      if (response.ok) {
        const { url } = await response.json();
        setCertificateUrl(url);
        setCelebration(true);
        setTimeout(() => setCelebration(false), 6000);
      } else if (response.status === 404) {
        console.warn('Certificate endpoint not found – skipping certificate');
        setCelebration(true);
        setTimeout(() => setCelebration(false), 6000);
      } else {
        console.error('Certificate generation failed');
      }
    } catch (err) {
      console.error('Certificate generation error:', err);
    } finally {
      setCertLoading(false);
    }
  }, [courseId, certLoading, certificateUrl]);

  // 5. Update progress while playing, trigger quiz when video completed
  useEffect(() => {
    if (!videoRef.current) return;

    const updateProgress = async () => {
      if (videoRef.current && !videoRef.current.paused) {
        const currentTime = Math.floor(videoRef.current.currentTime);
        const duration = videoRef.current.duration;
        const isCompleted = duration > 0 && currentTime / duration >= 0.95;

        if (isCompleted !== progress.completed || currentTime !== progress.last_watched_seconds) {
          const { error } = await supabase
            .from('lesson_progress')
            .upsert({
              student_id: userId,
              lesson_id: lesson.id,
              last_watched_seconds: currentTime,
              completed: isCompleted,
              completed_at: isCompleted ? new Date().toISOString() : null,
            }, { onConflict: 'student_id,lesson_id' });

          if (!error) {
            setProgress(prev => ({ ...prev, last_watched_seconds: currentTime, completed: isCompleted }));
            // Show quiz when video just completed and quiz not passed
            if (isCompleted && !progress.completed && !progress.passed_quiz) {
              setShowQuiz(true);
            }
            if (onProgressUpdate) onProgressUpdate(lesson.id, { completed: isCompleted, passed_quiz: progress.passed_quiz });
          }
        }
      }
    };

    progressInterval.current = setInterval(updateProgress, 3000);
    return () => clearInterval(progressInterval.current);
  }, [lesson.id, userId, progress.completed, progress.passed_quiz, onProgressUpdate]);

  // Seek to last watched position
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (progress.last_watched_seconds > 0) {
        video.currentTime = progress.last_watched_seconds;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [progress.last_watched_seconds]);

  // Handle play/pause to keep interval running
  const handlePlay = () => {
    if (!progressInterval.current) {
      progressInterval.current = setInterval(async () => {
        if (videoRef.current && !videoRef.current.paused) {
          const currentTime = Math.floor(videoRef.current.currentTime);
          const duration = videoRef.current.duration;
          const isCompleted = duration > 0 && currentTime / duration >= 0.95;
          if (isCompleted !== progress.completed) {
            await supabase
              .from('lesson_progress')
              .upsert({
                student_id: userId,
                lesson_id: lesson.id,
                last_watched_seconds: currentTime,
                completed: isCompleted,
                completed_at: isCompleted ? new Date().toISOString() : null,
              }, { onConflict: 'student_id,lesson_id' });
            setProgress(prev => ({ ...prev, last_watched_seconds: currentTime, completed: isCompleted }));
            if (isCompleted && !progress.completed && !progress.passed_quiz) setShowQuiz(true);
          }
        }
      }, 3000);
    }
  };

  const handlePause = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  // Called by QuizPanel when the user passes the quiz
  const handleQuizPassed = async () => {
    const { error } = await supabase
      .from('lesson_progress')
      .update({ passed_quiz: true, completed: true })
      .eq('student_id', userId)
      .eq('lesson_id', lesson.id);

    if (!error) {
      setProgress(prev => ({ ...prev, passed_quiz: true, completed: true }));
      setShowQuiz(false);
      if (onProgressUpdate) onProgressUpdate(lesson.id, { completed: true, passed_quiz: true });

      // After passing quiz, check overall course completion for certificate
      const allDone = await checkAllLessonsCompleted();
      if (allDone && !certificateUrl) {
        await generateCertificate();
      }
    } else {
      console.error('Failed to update passed_quiz:', error);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 relative">
      {/* Video Player */}
      <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative">
        {videoLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-black/80">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-rose-200 border-t-brand-rose-600" />
            <span className="ml-2">Loading video...</span>
          </div>
        ) : videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            playsInline
            className="w-full h-full"
            onPlay={handlePlay}
            onPause={handlePause}
            onError={() => {
              console.error('Video playback error');
              setVideoUrl(null);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-black">
            No video available for this lesson.
          </div>
        )}
      </div>

      {/* Quiz Panel – appears after video completion if not passed */}
      {showQuiz && !progress.passed_quiz && (
        <div className="w-full max-w-4xl mt-6">
          <QuizPanel
            lessonId={lesson.id}
            userId={userId}
            onQuizPassed={handleQuizPassed}
          />
        </div>
      )}

      {/* Celebration banner for course completion */}
      {celebration && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <GlassCard className="px-6 py-3 bg-gradient-to-r from-green-100 to-emerald-100 border-green-300 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <p className="font-bold text-green-800">Course Completed!</p>
                {certificateUrl ? (
                  <a
                    href={certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-rose-600 underline"
                  >
                    View your certificate →
                  </a>
                ) : (
                  <p className="text-sm text-green-700">Congratulations!</p>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}