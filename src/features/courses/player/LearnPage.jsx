import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import GlassCard from '@/shared/components/GlassCard';
import PageTransition from '@/shared/components/PageTransition';
import BackgroundBlobs from '@/shared/components/BackgroundBlobs';
import { useAuth } from '@/features/auth/hooks/useAuth';
import LessonWorkspace from './LessonWorkspace';
import ChatBubble from '@/features/chat/ChatBubble';
import { useCallNotifications } from '@/features/calls/useCallNotifications';
import CallNotification from '@/features/calls/CallNotification';

// Completion bar component (shows progress and manual certificate button)
function CourseCompletionBar({ courseId, userId }) {
  const [progressData, setProgressData] = useState({ completedLessons: 0, totalLessons: 0, allCompleted: false });
  const [certificateUrl, setCertificateUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchCompletionStatus() {
      const { data: modules } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', courseId);
      if (!modules || modules.length === 0) return;
      const moduleIds = modules.map(m => m.id);

      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .in('module_id', moduleIds);
      if (!lessons) return;
      const totalLessons = lessons.length;
      const lessonIds = lessons.map(l => l.id);

      const { data: completed } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('student_id', userId)
        .in('lesson_id', lessonIds)
        .eq('passed_quiz', true);

      const completedCount = completed?.length || 0;
      const allCompleted = completedCount === totalLessons && totalLessons > 0;

      setProgressData({
        completedLessons: completedCount,
        totalLessons,
        allCompleted,
      });
    }
    fetchCompletionStatus();
  }, [courseId, userId]);

  const handleClaimCertificate = async () => {
    if (loading || certificateUrl) return;
    setLoading(true);
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
      }
    } catch (err) {
      console.error('Failed to generate certificate:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!progressData.totalLessons) return null;

  const percent = (progressData.completedLessons / progressData.totalLessons) * 100;

  return (
    <div className="mt-4 p-3 bg-white/50 rounded-xl border border-brand-rose-200/40">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>Course progress</span>
        <span>{progressData.completedLessons} / {progressData.totalLessons} lessons</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-brand-rose-500 rounded-full" style={{ width: `${percent}%` }} />
      </div>

      {progressData.allCompleted && (
        <div className="mt-3 text-center">
          {certificateUrl ? (
            <a
              href={certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm bg-green-600 text-white px-3 py-1.5 rounded-full hover:bg-green-700 transition"
            >
              🎓 View Certificate
            </a>
          ) : (
            <button
              onClick={handleClaimCertificate}
              disabled={loading}
              className="text-sm bg-brand-rose-600 text-white px-3 py-1.5 rounded-full hover:bg-brand-rose-700 transition disabled:opacity-50"
            >
              {loading ? 'Generating...' : '🏆 Claim Certificate'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function LearnPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState({});

  // Call notifications hook
  useCallNotifications();

  // Fetch course, modules, enrollment
  useEffect(() => {
    async function fetchData() {
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!courseData) {
        setLoading(false);
        return;
      }
      setCourse(courseData);

      const { data: modulesData } = await supabase
        .from('modules')
        .select('*, lessons(*)')
        .eq('course_id', courseData.id)
        .order('position');

      setModules(modulesData || []);

      if (user) {
        const { data: enrollData } = await supabase
          .from('enrollments')
          .select('*')
          .eq('student_id', user.id)
          .eq('course_id', courseData.id)
          .eq('status', 'active')
          .maybeSingle();
        setEnrollment(enrollData || null);
      }

      setLoading(false);
    }
    fetchData();
  }, [slug, user]);

  // Load progress for all lessons
  const loadProgress = useCallback(async () => {
    if (!user) return;
    const allLessons = modules.flatMap(m => m.lessons);
    const lessonIds = allLessons.map(l => l.id);
    if (lessonIds.length === 0) return;

    const { data } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed, passed_quiz, quiz_attempts')
      .eq('student_id', user.id)
      .in('lesson_id', lessonIds);

    const map = {};
    (data || []).forEach(p => { map[p.lesson_id] = p; });
    setProgressMap(map);
  }, [user, modules]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Set initial active lesson (first unlocked lesson)
  useEffect(() => {
    if (modules.length > 0 && !activeLesson) {
      const flatLessons = modules.flatMap(m => m.lessons);
      for (let i = 0; i < flatLessons.length; i++) {
        const lesson = flatLessons[i];
        const prevLesson = i > 0 ? flatLessons[i - 1] : null;
        let locked = false;
        if (prevLesson) {
          const prevProgress = progressMap[prevLesson.id];
          locked = !prevProgress || !prevProgress.quiz_attempts || prevProgress.quiz_attempts.length === 0;
        }
        if (!locked) {
          setActiveLesson(lesson);
          break;
        }
      }
    }
  }, [modules, progressMap, activeLesson]);

  const isLessonLocked = (lesson, flatLessons, progressMap) => {
    const index = flatLessons.findIndex(l => l.id === lesson.id);
    if (index <= 0) return false;
    const prevLesson = flatLessons[index - 1];
    const prevProgress = progressMap[prevLesson.id];
    return !prevProgress || !prevProgress.quiz_attempts || prevProgress.quiz_attempts.length === 0;
  };

  const flatLessons = modules.flatMap(m => m.lessons);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fff6f9] to-[#fff0f4]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-rose-200 border-t-brand-rose-600" />
      </div>
    );
  }

  if (!course || !enrollment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-display font-semibold">Access Denied</h2>
          <p className="text-gray-500 mt-2">You are not enrolled in this course.</p>
          <Link to="/courses" className="btn-primary mt-4 inline-block">
            View Courses
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff6f9] via-[#fdf2ee] to-[#fff0f4] relative overflow-hidden">
      <BackgroundBlobs section="mid" />
      <PageTransition>
        <div className="flex h-screen relative z-10">
          {/* Sidebar */}
          <div className={`bg-white/80 backdrop-blur-xl border-r border-brand-rose-200/40 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
            <div className="p-4 border-b border-brand-rose-200/40 flex items-center justify-between">
              <h2 className="font-display font-semibold text-lg truncate">{course.title}</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-brand-rose-600 hover:text-brand-rose-800">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <CourseCompletionBar courseId={course.id} userId={user.id} />
              {modules.map((mod) => {
                return (
                  <div key={mod.id}>
                    <h3 className="text-xs font-semibold text-brand-rose-600 uppercase tracking-wider mb-2">{mod.title}</h3>
                    <div className="space-y-1">
                      {mod.lessons.map((lesson) => {
                        const locked = isLessonLocked(lesson, flatLessons, progressMap);
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => !locked && setActiveLesson(lesson)}
                            disabled={locked}
                            className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 text-sm ${
                              activeLesson?.id === lesson.id
                                ? 'bg-brand-rose-100 border border-brand-rose-300 text-brand-rose-800'
                                : locked
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'hover:bg-white/50 border border-transparent'
                            }`}
                          >
                            <span className="w-6 h-6 rounded-full bg-brand-rose-100 flex items-center justify-center text-xs">
                              {locked ? '🔒' : (lesson.free_preview ? '🎥' : '📘')}
                            </span>
                            <span className="flex-1 truncate">{lesson.title}</span>
                            {progressMap[lesson.id]?.passed_quiz && (
                              <span className="text-green-600 text-xs">✅</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col">
            <div className="bg-white/80 backdrop-blur-xl border-b border-brand-rose-200/40 p-4 flex items-center gap-4">
              {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)} className="text-brand-rose-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              )}
              <div className="flex-1">
                <h1 className="font-display font-semibold text-xl truncate">{activeLesson?.title || 'Select a lesson'}</h1>
                <p className="text-xs text-gray-500">{course.title}</p>
              </div>
              <Link to="/dashboard" className="btn-ghost text-xs px-3 py-1.5">
                Dashboard
              </Link>
            </div>

            <div className="flex-1 bg-black/5 relative overflow-hidden">
              {activeLesson ? (
                <LessonWorkspace
                  key={activeLesson.id}
                  lesson={activeLesson}
                  courseId={course.id}
                  userId={user.id}
                  onQuizTaken={() => loadProgress()}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Select a lesson to start learning
                </div>
              )}
            </div>
          </div>
        </div>
      </PageTransition>

      {/* ChatBubble */}
      <ChatBubble />

      {/* Call notification overlay */}
      <CallNotification />
    </div>
  );
}