import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/config/supabase';
import { sendNotification } from '@/lib/notifications';
import { useAuth } from '@/features/auth/hooks/useAuth';
import LessonWorkspace from './LessonWorkspace';
import CourseCompletionBar from './CourseCompletionBar';
import ChatBubble from '@/features/chat/ChatBubble';
import CallNotification from '@/features/calls/CallNotification';

// ─── Icon helpers (unchanged) ──────────────────────────────────────────────
function CheckIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
function LockIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function PlayIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}

// ─── Inline styles ─────────────────────────────────────────────────────────
const S = {
  sidebarBg: '#0f0a10',
  sidebarBorder: 'rgba(232,112,144,0.18)',
  sidebarText: 'rgba(255,240,245,0.85)',
  sidebarMuted: 'rgba(255,180,210,0.45)',
  sidebarHover: 'rgba(255,255,255,0.05)',
  sidebarActive: 'rgba(232,112,144,0.14)',
  sidebarActiveRail: '#e87090',

  canvasBg: '#faf8f7',
  cardBg: 'rgba(255,255,255,0.92)',
  cardBorder: 'rgba(220,160,180,0.2)',

  rose: '#c84070',
  roseLight: '#f0a0b8',
  roseDark: '#8a2040',
  gold: '#d4a030',

  fontDisplay: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  fontBody: "'DM Sans', system-ui, sans-serif",

  radius: 16,
  radiusSm: 10,
};

// ─── Lesson status helpers ─────────────────────────────────────────────────
function isLessonLocked(lesson, flatLessons, progressMap) {
  const index = flatLessons.findIndex(l => l.id === lesson.id);
  if (index <= 0) return false;
  const prev = flatLessons[index - 1];
  const prevProgress = progressMap[prev.id];
  return !prevProgress?.quiz_attempts?.length;
}

function lessonStatus(lesson, progressMap) {
  const p = progressMap[lesson.id];
  if (!p) return 'untouched';
  if (p.passed_quiz) return 'passed';
  if (p.quiz_attempts?.length) return 'attempted';
  if (p.last_watched_seconds > 0) return 'watching';
  return 'untouched';
}

// ─── Sidebar lesson row ────────────────────────────────────────────────────
function LessonRow({ lesson, isActive, locked, status, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={locked}
      whileTap={locked ? {} : { scale: 0.98 }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: S.radiusSm,
        border: 'none',
        cursor: locked ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        position: 'relative',
        background: isActive ? S.sidebarActive : 'transparent',
        transition: 'background 0.2s',
        opacity: locked ? 0.4 : 1,
      }}
      onMouseEnter={e => { if (!isActive && !locked) e.currentTarget.style.background = S.sidebarHover; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      {isActive && (
        <span style={{
          position: 'absolute', left: 0, top: '20%', bottom: '20%',
          width: 3, borderRadius: 2, background: S.sidebarActiveRail,
        }} />
      )}
      <span style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: locked
          ? 'rgba(255,255,255,0.06)'
          : status === 'passed'
          ? 'rgba(72,200,120,0.15)'
          : isActive
          ? 'rgba(232,112,144,0.2)'
          : 'rgba(255,255,255,0.06)',
        border: isActive ? `1px solid rgba(232,112,144,0.4)` : '1px solid rgba(255,255,255,0.08)',
        color: locked
          ? 'rgba(255,255,255,0.3)'
          : status === 'passed'
          ? '#48c878'
          : isActive
          ? S.sidebarActiveRail
          : S.sidebarMuted,
      }}>
        {locked
          ? <LockIcon size={11} />
          : status === 'passed'
          ? <CheckIcon size={11} />
          : <PlayIcon size={10} />
        }
      </span>
      <span style={{
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontFamily: S.fontBody, fontSize: 13, fontWeight: isActive ? 500 : 400,
        color: isActive ? 'rgba(255,240,245,0.95)' : S.sidebarText,
        lineHeight: 1.3,
      }}>
        {lesson.title}
      </span>
      {lesson.duration_seconds > 0 && (
        <span style={{
          fontFamily: S.fontBody, fontSize: 10, color: S.sidebarMuted, flexShrink: 0,
        }}>
          {Math.floor(lesson.duration_seconds / 60)}m
        </span>
      )}
    </motion.button>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ open, onClose, course, modules, activeLesson, setActiveLesson, progressMap, userId }) {
  const flatLessons = modules.flatMap(m => m.lessons || []);
  const totalLessons = flatLessons.length;
  const passedCount = flatLessons.filter(l => progressMap[l.id]?.passed_quiz).length;
  const pct = totalLessons > 0 ? Math.round((passedCount / totalLessons) * 100) : 0;

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? 300 : 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: S.sidebarBg,
        borderRight: `1px solid ${S.sidebarBorder}`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', flexShrink: 0,
        height: '100vh', position: 'relative',
      }}
    >
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: `1px solid ${S.sidebarBorder}`,
          background: 'rgba(255,255,255,0.03)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: 'linear-gradient(135deg,#c84070,#f07090)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.8)' }} />
                </div>
                <span style={{ fontFamily: S.fontDisplay, fontSize: 13, color: S.roseLight, letterSpacing: '0.04em' }}>Lumière Academy</span>
              </div>
              <h2 style={{
                fontFamily: S.fontDisplay, fontSize: 17, fontWeight: 600,
                color: 'rgba(255,240,245,0.95)', lineHeight: 1.25,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {course.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: 6, cursor: 'pointer', color: S.sidebarMuted,
                display: 'flex', flexShrink: 0, transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,240,245,0.9)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = S.sidebarMuted; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            >
              <ChevronLeftIcon />
            </button>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: S.fontBody, fontSize: 11, color: S.sidebarMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Your progress</span>
              <span style={{ fontFamily: S.fontBody, fontSize: 11, fontWeight: 600, color: pct === 100 ? '#48c878' : S.roseLight }}>
                {passedCount}/{totalLessons}
              </span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  height: '100%', borderRadius: 2,
                  background: pct === 100
                    ? 'linear-gradient(90deg, #48c878, #80e8a0)'
                    : 'linear-gradient(90deg, #c84070, #f0a030)',
                }}
              />
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
          <CourseCompletionBar courseId={course.id} userId={userId} passedCount={passedCount} totalLessons={totalLessons} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 24px' }}>
          {modules.map((mod, mi) => {
            const modLessons = mod.lessons || [];
            const modPassed = modLessons.filter(l => progressMap[l.id]?.passed_quiz).length;
            return (
              <div key={mod.id} style={{ marginBottom: 4 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px 6px',
                }}>
                  <span style={{
                    fontFamily: S.fontBody, fontSize: 10, fontWeight: 700,
                    color: S.sidebarMuted, letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>
                    {mod.title}
                  </span>
                  <span style={{
                    fontFamily: S.fontBody, fontSize: 10,
                    color: modPassed === modLessons.length && modLessons.length > 0 ? '#48c878' : S.sidebarMuted,
                  }}>
                    {modPassed}/{modLessons.length}
                  </span>
                </div>
                {modLessons.map((lesson) => {
                  const locked = isLessonLocked(lesson, flatLessons, progressMap);
                  const status = lessonStatus(lesson, progressMap);
                  return (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      isActive={activeLesson?.id === lesson.id}
                      locked={locked}
                      status={status}
                      onClick={() => !locked && setActiveLesson(lesson)}
                    />
                  );
                })}
                {mi < modules.length - 1 && (
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 12px' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.aside>
  );
}

// ─── Topbar ─────────────────────────────────────────────────────────────────
function Topbar({ sidebarOpen, onOpenSidebar, course, activeLesson, flatLessons, progressMap, setActiveLesson }) {
  const currentIndex = flatLessons.findIndex(l => l.id === activeLesson?.id);
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;
  const nextLocked = nextLesson ? isLessonLocked(nextLesson, flatLessons, progressMap) : false;

  return (
    <header style={{
      height: 60, flexShrink: 0,
      background: 'rgba(250,248,247,0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(200,64,112,0.12)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 12,
      position: 'relative', zIndex: 10,
    }}>
      {!sidebarOpen && (
        <button
          onClick={onOpenSidebar}
          style={{
            background: 'rgba(200,64,112,0.08)', border: '1px solid rgba(200,64,112,0.2)',
            borderRadius: 8, padding: '7px 8px', cursor: 'pointer', color: S.rose,
            display: 'flex', alignItems: 'center', flexShrink: 0,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,64,112,0.14)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(200,64,112,0.08)'}
          title="Open course menu"
        >
          <MenuIcon />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: S.fontBody, fontSize: 11, color: '#9a6070',
          letterSpacing: '0.04em', marginBottom: 1,
        }}>
          {course.title}
        </div>
        <h1 style={{
          fontFamily: S.fontDisplay, fontSize: 18, fontWeight: 600, color: '#1a0810',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.2,
        }}>
          {activeLesson?.title || 'Select a lesson'}
        </h1>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => prevLesson && setActiveLesson(prevLesson)}
          disabled={!prevLesson}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'transparent', border: '1px solid rgba(200,64,112,0.2)',
            borderRadius: 8, padding: '6px 12px', cursor: prevLesson ? 'pointer' : 'not-allowed',
            fontFamily: S.fontBody, fontSize: 12, color: prevLesson ? S.rose : '#ccc',
            transition: 'all 0.2s', opacity: prevLesson ? 1 : 0.4,
          }}
        >
          <ChevronLeftIcon /> Prev
        </button>
        <button
          onClick={() => nextLesson && !nextLocked && setActiveLesson(nextLesson)}
          disabled={!nextLesson || nextLocked}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: nextLesson && !nextLocked ? 'linear-gradient(135deg,#c84070,#f07090)' : 'transparent',
            border: '1px solid rgba(200,64,112,0.2)',
            borderRadius: 8, padding: '6px 12px',
            cursor: nextLesson && !nextLocked ? 'pointer' : 'not-allowed',
            fontFamily: S.fontBody, fontSize: 12,
            color: nextLesson && !nextLocked ? 'white' : '#ccc',
            transition: 'all 0.2s', opacity: nextLesson && !nextLocked ? 1 : 0.4,
            boxShadow: nextLesson && !nextLocked ? '0 2px 12px rgba(200,64,112,0.3)' : 'none',
          }}
        >
          Next <ChevronRightIcon />
        </button>
      </div>
      <Link
        to="/dashboard"
        style={{
          fontFamily: S.fontBody, fontSize: 12, color: '#9a6070',
          textDecoration: 'none', padding: '6px 12px',
          border: '1px solid rgba(200,64,112,0.15)',
          borderRadius: 8, flexShrink: 0, transition: 'color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = S.rose}
        onMouseLeave={e => e.currentTarget.style.color = '#9a6070'}
      >
        ← Dashboard
      </Link>
    </header>
  );
}

// ─── Loading / Access / Empty states (unchanged) ───────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #fff6f9 0%, #fdf2ee 100%)',
    }}>
      <div style={{ position: 'relative', width: 48, height: 48, marginBottom: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid rgba(200,64,112,0.15)',
          borderTop: '3px solid #c84070',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
      <p style={{ fontFamily: S.fontDisplay, fontSize: 16, fontStyle: 'italic', color: '#9a4060' }}>
        Loading your course...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AccessDenied() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #fff6f9 0%, #fdf2ee 100%)',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(200,64,112,0.2)',
        borderRadius: 24, padding: '48px 40px', textAlign: 'center', maxWidth: 400,
        boxShadow: '0 20px 60px rgba(180,60,90,0.12)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
        <h2 style={{ fontFamily: S.fontDisplay, fontSize: 28, fontWeight: 600, color: '#1a0810', marginBottom: 8 }}>
          Access Restricted
        </h2>
        <p style={{ fontFamily: S.fontBody, fontSize: 14, color: '#6a3040', marginBottom: 28, lineHeight: 1.6 }}>
          You're not enrolled in this course yet. Browse our catalog to find the right program for you.
        </p>
        <Link
          to="/courses"
          style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg,#c84070,#f07090)',
            color: 'white', fontFamily: S.fontBody, fontSize: 14, fontWeight: 500,
            padding: '12px 28px', borderRadius: 100, textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(200,64,112,0.35)',
          }}
        >
          View Courses →
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ onOpenSidebar }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 16,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(200,64,112,0.1), rgba(248,112,150,0.06))',
        border: '1px solid rgba(200,64,112,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28,
      }}>
        🎬
      </div>
      <h3 style={{ fontFamily: S.fontDisplay, fontSize: 22, fontWeight: 500, color: '#1a0810' }}>
        Choose a lesson to begin
      </h3>
      <p style={{ fontFamily: S.fontBody, fontSize: 14, color: '#9a6070', textAlign: 'center', maxWidth: 280 }}>
        Open the course menu to browse modules and select your next lesson.
      </p>
      <button
        onClick={onOpenSidebar}
        style={{
          marginTop: 4,
          background: 'linear-gradient(135deg,#c84070,#f07090)',
          color: 'white', fontFamily: S.fontBody, fontSize: 14, fontWeight: 500,
          padding: '11px 24px', borderRadius: 100, border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(200,64,112,0.3)',
        }}
      >
        Open course menu
      </button>
    </div>
  );
}

// ─── LearnPage ──────────────────────────────────────────────────────────────
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
  const [progressLoaded, setProgressLoaded] = useState(false);

  const flatLessons = modules.flatMap(m => m.lessons || []);
  const lessonIdKey = flatLessons.map(l => l.id).join(',');

  // ── Realtime call listener ──────────────────────────────────────────────


  // ── Fetch course + modules + enrollment ─────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    async function fetchData() {
      setLoading(true);

      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!courseData) { setLoading(false); return; }
      setCourse(courseData);

      const { data: modulesData } = await supabase
        .from('modules')
        .select('*, lessons(*)')
        .eq('course_id', courseData.id)
        .order('position');

      const sortedModules = (modulesData || []).map(mod => ({
        ...mod,
        lessons: (mod.lessons || []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      }));
      setModules(sortedModules);

      if (user) {
        const { data: enrollData } = await supabase
          .from('enrollments')
          .select('*')
          .eq('student_id', user.id)
          .eq('course_id', courseData.id)
          .eq('status', 'active')
          .maybeSingle();
        setEnrollment(enrollData || null);
      } else {
        setEnrollment(null);
      }

      setLoading(false);
    }
    fetchData();
  }, [slug, user?.id]);

  // ── Load progress ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !lessonIdKey) return;
    const lessonIds = lessonIdKey.split(',').filter(Boolean);
    if (!lessonIds.length) return;

    const loadProgress = async () => {
      const { data } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed, passed_quiz, quiz_attempts, last_watched_seconds')
        .eq('student_id', user.id)
        .in('lesson_id', lessonIds);

      const map = {};
      (data || []).forEach(p => { map[p.lesson_id] = p; });
      setProgressMap(map);
      setProgressLoaded(true);
    };
    loadProgress();
  }, [user?.id, lessonIdKey]);

  // ── Auto‑select first unlocked lesson after progress loads ──────────────
  useEffect(() => {
    if (!progressLoaded || flatLessons.length === 0) return;

    // If there's already an active lesson, make sure it still exists in the fetched data
    if (activeLesson && !flatLessons.find(l => l.id === activeLesson.id)) {
      // Ghost lesson detected – reset to first real lesson
      setActiveLesson(flatLessons[0]);
      return;
    }

    if (activeLesson) return; // already set

    let resumeLesson = flatLessons[0];
    for (let i = 0; i < flatLessons.length; i++) {
      const locked = isLessonLocked(flatLessons[i], flatLessons, progressMap);
      if (!locked) {
        resumeLesson = flatLessons[i];
      } else {
        break;
      }
    }
    setActiveLesson(resumeLesson);
  }, [progressLoaded, lessonIdKey, flatLessons, activeLesson, progressMap]);

  // ── Mobile sidebar auto‑close ─────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
    };
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen />;
  if (!course || !enrollment) return <AccessDenied />;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: S.canvasBg }}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        course={course}
        modules={modules}
        activeLesson={activeLesson}
        setActiveLesson={(lesson) => {
          setActiveLesson(lesson);
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
        progressMap={progressMap}
        userId={user.id}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Topbar
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          course={course}
          activeLesson={activeLesson}
          flatLessons={flatLessons}
          progressMap={progressMap}
          setActiveLesson={setActiveLesson}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {activeLesson ? (
              <motion.div
                key={activeLesson.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                style={{ height: '100%' }}
              >
                <LessonWorkspace
                  lesson={activeLesson}
                  courseId={course.id}
                  userId={user.id}
                  onQuizSubmitted={() => {
                    if (user?.id && lessonIdKey) {
                      supabase
                        .from('lesson_progress')
                        .select('lesson_id, completed, passed_quiz, quiz_attempts, last_watched_seconds')
                        .eq('student_id', user.id)
                        .in('lesson_id', lessonIdKey.split(',').filter(Boolean))
                        .then(({ data }) => {
                          const map = {};
                          (data || []).forEach(p => { map[p.lesson_id] = p; });
                          setProgressMap(map);
                        });
                    }
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ height: '100%' }}
              >
                <EmptyState onOpenSidebar={() => setSidebarOpen(true)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <ChatBubble />
      <CallNotification />
    </div>
  );
}