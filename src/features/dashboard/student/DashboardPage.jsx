import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { S, Skeleton, PageShell, SectionTitle, EmptyState, Tag, stagger } from './dashboardShared';

// ─── Greeting by time of day ──────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent, subtext, delay }) {
  return (
    <motion.div {...stagger(delay)}>
      <div style={{
        background: S.cardBg, border: `1px solid ${S.cardBorder}`,
        borderRadius: S.cardRadius, padding: '20px',
        display: 'flex', flexDirection: 'column', gap: 12,
        boxShadow: S.cardShadow, height: '100%',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = S.cardShadowHover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = S.cardShadow; e.currentTarget.style.transform = 'none'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
            boxShadow: `0 4px 12px ${accent.includes('c84') ? 'rgba(200,64,112,0.25)' : 'rgba(0,0,0,0.1)'}`,
          }}>
            {icon}
          </div>
        </div>
        <div>
          <p style={{ fontFamily: S.fontDisplay, fontSize: 34, fontWeight: 600, color: S.textPrimary, margin: 0, lineHeight: 1 }}>
            {value ?? '—'}
          </p>
          <p style={{ fontFamily: S.fontBody, fontSize: 12.5, color: S.textMuted, margin: '4px 0 0', fontWeight: 500, letterSpacing: '0.01em' }}>
            {label}
          </p>
        </div>
        {subtext && (
          <p style={{ fontFamily: S.fontBody, fontSize: 11, color: S.textMuted, margin: 0, paddingTop: 4, borderTop: `1px solid ${S.cardBorder}` }}>
            {subtext}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Course card ──────────────────────────────────────────────────────────────
function CourseCard({ enrollment, index }) {
  const { courses } = enrollment;
  const progress = enrollment.totalLessons > 0
    ? Math.round((enrollment.completedLessons / enrollment.totalLessons) * 100)
    : 0;

  const coverColors = [
    'linear-gradient(135deg,#fce4ec,#f8bbd0,#f48fb1)',
    'linear-gradient(135deg,#fce4ec,#f3c6d4,#e8a0b8)',
    'linear-gradient(135deg,#fff3e0,#ffe0b2,#ffcc80)',
    'linear-gradient(135deg,#e8f5e9,#c8e6c9,#a5d6a7)',
  ];

  return (
    <motion.div {...stagger(index)}>
      {/* FIX: no button-in-a — whole card is the link */}
      <Link to={`/learn/${courses?.slug || '#'}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div
          style={{
            background: S.cardBg, border: `1px solid ${S.cardBorder}`,
            borderRadius: S.cardRadius, overflow: 'hidden',
            boxShadow: S.cardShadow, cursor: 'pointer',
            transition: 'box-shadow 0.2s, transform 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = S.cardShadowHover; e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = S.cardShadow; e.currentTarget.style.transform = 'none'; }}
        >
          {/* Cover */}
          <div style={{
            width: '100%', height: 90,
            background: courses?.cover_image_url
              ? `url(${courses.cover_image_url}) center/cover no-repeat`
              : coverColors[index % coverColors.length],
            position: 'relative', overflow: 'hidden',
          }}>
            {!courses?.cover_image_url && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, opacity: 0.6,
              }}>📚</div>
            )}
            {/* Progress overlay strip */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
              background: 'rgba(0,0,0,0.15)',
            }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                style={{ height: '100%', background: 'linear-gradient(90deg,#c84070,#f0a030)' }}
              />
            </div>
            {/* Badge */}
            {progress === 100 && (
              <div style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(46,204,113,0.9)', color: 'white',
                fontFamily: S.fontBody, fontSize: 10, fontWeight: 600,
                padding: '3px 8px', borderRadius: 100,
              }}>
                ✓ Complete
              </div>
            )}
          </div>

          {/* Body */}
          <div style={{ padding: '14px 16px 16px' }}>
            <h3 style={{
              fontFamily: S.fontDisplay, fontSize: 15, fontWeight: 600,
              color: S.textPrimary, margin: '0 0 4px', lineHeight: 1.3,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {courses?.title || 'Untitled'}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <div style={{ flex: 1, height: 4, background: '#f0e0e8', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${progress}%`, height: '100%', borderRadius: 2,
                    background: progress === 100
                      ? 'linear-gradient(90deg,#2ecc71,#27ae60)'
                      : 'linear-gradient(90deg,#c84070,#f0a030)',
                    transition: 'width 0.8s ease',
                  }} />
                </div>
                <span style={{ fontFamily: S.fontBody, fontSize: 11, color: S.textMuted, fontWeight: 500, flexShrink: 0 }}>
                  {enrollment.completedLessons}/{enrollment.totalLessons}
                </span>
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12,
            }}>
              <span style={{ fontFamily: S.fontBody, fontSize: 11, color: S.textMuted }}>
                {new Date(enrollment.purchased_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span style={{
                fontFamily: S.fontBody, fontSize: 12, fontWeight: 500,
                color: S.rose, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                Continue →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Call row ─────────────────────────────────────────────────────────────────
function CallRow({ call }) {
  const dt = new Date(call.scheduled_at);
  const isToday = new Date().toDateString() === dt.toDateString();
  const statusColors = {
    scheduled: S.blue,
    completed: S.green,
    cancelled: '#e74c3c',
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0', borderBottom: `1px solid ${S.cardBorder}`,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 11, flexShrink: 0,
        background: isToday ? 'rgba(200,64,112,0.1)' : 'rgba(52,152,219,0.08)',
        border: isToday ? `1px solid rgba(200,64,112,0.25)` : `1px solid rgba(52,152,219,0.2)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: S.fontBody, fontSize: 13, fontWeight: 700, color: isToday ? S.rose : S.blue, lineHeight: 1 }}>
          {dt.getDate()}
        </span>
        <span style={{ fontFamily: S.fontBody, fontSize: 9, color: S.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {dt.toLocaleString('en-US', { month: 'short' })}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: S.fontBody, fontSize: 13, fontWeight: 500, color: S.textPrimary, margin: 0 }}>
          {isToday ? '🔴 Today' : dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
        <p style={{ fontFamily: S.fontBody, fontSize: 11, color: S.textMuted, margin: '1px 0 0' }}>
          {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <Tag color={statusColors[call.status] || S.textMuted}>
        {call.status || 'scheduled'}
      </Tag>
    </div>
  );
}

// ─── Certificate row ──────────────────────────────────────────────────────────
function CertRow({ cert }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0', borderBottom: `1px solid ${S.cardBorder}`,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 11, flexShrink: 0,
        background: 'rgba(212,160,48,0.1)',
        border: '1px solid rgba(212,160,48,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>🏅</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: S.fontBody, fontSize: 13, fontWeight: 500, color: S.textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cert.courses?.title || 'Certificate'}
        </p>
        <p style={{ fontFamily: S.fontBody, fontSize: 11, color: S.textMuted, margin: '1px 0 0' }}>
          {new Date(cert.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
      <a
        href={cert.certificate_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: S.fontBody, fontSize: 11, fontWeight: 600,
          color: S.rose, textDecoration: 'none', flexShrink: 0,
          padding: '4px 10px', border: `1px solid ${S.roseBorder}`,
          borderRadius: 100, transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = S.roseBg}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        View →
      </a>
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: S.cardBg, border: `1px solid ${S.cardBorder}`,
      borderRadius: S.cardRadius, boxShadow: S.cardShadow,
      padding: 20, ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Loading skeleton layout ──────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <PageShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Skeleton height={48} radius={10} style={{ maxWidth: 340 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} height={100} radius={14} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} height={240} radius={14} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <Skeleton height={300} radius={14} />
          <Skeleton height={300} radius={14} />
        </div>
      </div>
    </PageShell>
  );
}

// ─── DashboardPage ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [upcomingCalls, setUpcomingCalls] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState({ courses: 0, completedLessons: 0, totalLessons: 0, calls: 0, certs: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    async function fetchDashboard() {
      setLoading(true);
      setError(null);
      try {
        // ── 1. Enrollments + courses ───────────────────────────────────────
        const { data: enrollData, error: enrollErr } = await supabase
          .from('enrollments')
          .select('*, courses(*)')
          .eq('student_id', user.id)
          .eq('status', 'active')
          .order('purchased_at', { ascending: false });

        if (enrollErr) throw enrollErr;

        // ── 2. Batch-fetch all modules for all enrolled courses ────────────
        // FIX: single query instead of N+1 loop
        const courseIds = (enrollData || []).map(e => e.course_id);
        let progressMap = {}; // lessonId → progress

        if (courseIds.length > 0) {
          // Get all modules for all courses
          const { data: allMods } = await supabase
            .from('modules')
            .select('id, course_id')
            .in('course_id', courseIds);

          const allModIds = (allMods || []).map(m => m.id);

          // Get all lessons for all modules
          const { data: allLessons } = await supabase
            .from('lessons')
            .select('id, module_id')
            .in('module_id', allModIds);

          const allLessonIds = (allLessons || []).map(l => l.id);

          // Get all progress for student
          const { data: allProgress } = await supabase
            .from('lesson_progress')
            .select('lesson_id, passed_quiz, last_watched_seconds')
            .eq('student_id', user.id)
            .in('lesson_id', allLessonIds);

          // Build maps
          const modToCourse = {};
          (allMods || []).forEach(m => { modToCourse[m.id] = m.course_id; });

          const lessonToMod = {};
          (allLessons || []).forEach(l => { lessonToMod[l.id] = l.module_id; });

          // Count per course
          const courseTotal = {};
          const courseCompleted = {};
          courseIds.forEach(id => { courseTotal[id] = 0; courseCompleted[id] = 0; });
          (allLessons || []).forEach(l => {
            const cid = modToCourse[l.module_id];
            if (cid) courseTotal[cid] = (courseTotal[cid] || 0) + 1;
          });
          (allProgress || []).forEach(p => {
            const cid = modToCourse[lessonToMod[p.lesson_id]];
            if (cid && p.passed_quiz) {
              courseCompleted[cid] = (courseCompleted[cid] || 0) + 1;
            }
            progressMap[p.lesson_id] = p;
          });

          // Enrich enrollments
          const enriched = (enrollData || []).map(enr => ({
            ...enr,
            totalLessons: courseTotal[enr.course_id] || 0,
            completedLessons: courseCompleted[enr.course_id] || 0,
          }));
          setEnrollments(enriched);

          const totalCompleted = Object.values(courseCompleted).reduce((a, b) => a + b, 0);
          const totalAll = Object.values(courseTotal).reduce((a, b) => a + b, 0);

          // ── 3. Upcoming calls ─────────────────────────────────────────────
          const { data: callsData } = await supabase
            .from('video_call_sessions')
            .select('*')
            .eq('student_id', user.id)
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at')
            .limit(5);

          // ── 4. Certificates ───────────────────────────────────────────────
          const { data: certsData } = await supabase
            .from('certificates')
            .select('*, courses(title)')
            .eq('student_id', user.id)
            .order('issued_at', { ascending: false })
            .limit(5);

          setUpcomingCalls(callsData || []);
          setCertificates(certsData || []);
          setStats({
            courses: enriched.length,
            completedLessons: totalCompleted,
            totalLessons: totalAll,
            calls: callsData?.length || 0,
            certs: certsData?.length || 0,
          });
        } else {
          setEnrollments([]);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load your dashboard. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [user]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <PageShell>
        <div style={{
          padding: 32, textAlign: 'center', background: S.cardBg,
          border: `1px solid rgba(231,76,60,0.25)`, borderRadius: S.cardRadius,
        }}>
          <p style={{ fontFamily: S.fontBody, fontSize: 14, color: '#e74c3c', margin: '0 0 16px' }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{
            background: S.roseGrad, color: 'white', border: 'none',
            borderRadius: 100, padding: '10px 24px', cursor: 'pointer',
            fontFamily: S.fontBody, fontSize: 13,
          }}>
            Refresh page
          </button>
        </div>
      </PageShell>
    );
  }

  const overallPct = stats.totalLessons > 0
    ? Math.round((stats.completedLessons / stats.totalLessons) * 100)
    : 0;

  return (
    <PageShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── Welcome ──────────────────────────────────────────────────────── */}
        <motion.div {...stagger(0)} style={{
          display: 'flex', flexWrap: 'wrap',
          alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <p style={{ fontFamily: S.fontBody, fontSize: 13, color: S.textMuted, margin: '0 0 6px', letterSpacing: '0.02em' }}>
              {getGreeting()} 👋
            </p>
            <h1 style={{
              fontFamily: S.fontDisplay, fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 600, color: S.textPrimary, margin: 0, lineHeight: 1.1,
            }}>
              Welcome back,{' '}
              <span style={{
                background: 'linear-gradient(135deg, #c84070, #f0a030)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {profile?.full_name?.split(' ')[0] || 'Artist'}
              </span>
            </h1>
            {stats.courses > 0 && (
              <p style={{ fontFamily: S.fontBody, fontSize: 13, color: S.textMuted, margin: '6px 0 0' }}>
                {stats.completedLessons} of {stats.totalLessons} lessons passed
                {overallPct > 0 && ` · ${overallPct}% overall progress`}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/courses">
              <button style={{
                fontFamily: S.fontBody, fontSize: 13, fontWeight: 500,
                background: 'transparent', color: S.rose,
                border: `1px solid ${S.roseBorder}`,
                borderRadius: 100, padding: '9px 20px', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = S.roseBg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Browse Courses
              </button>
            </Link>
            <Link to="/dashboard/calls">
              <button style={{
                fontFamily: S.fontBody, fontSize: 13, fontWeight: 500,
                background: S.roseGrad, color: 'white', border: 'none',
                borderRadius: 100, padding: '9px 20px', cursor: 'pointer',
                boxShadow: '0 3px 12px rgba(200,64,112,0.3)',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(200,64,112,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(200,64,112,0.3)'; }}
              >
                Book a Call
              </button>
            </Link>
          </div>
        </motion.div>

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 14,
        }}>
          <StatCard
            label="Enrolled Courses" value={stats.courses}
            icon="📚" accent="linear-gradient(135deg,#f7708e,#c84070)"
            subtext={stats.courses === 0 ? 'Browse catalog to start' : `${enrollments.filter(e => e.completedLessons === e.totalLessons && e.totalLessons > 0).length} complete`}
            delay={0}
          />
          <StatCard
            label="Lessons Passed" value={stats.completedLessons}
            icon="✅" accent="linear-gradient(135deg,#48c878,#2ecc71)"
            subtext={stats.totalLessons > 0 ? `${overallPct}% of all lessons` : 'Start a lesson'}
            delay={1}
          />
          <StatCard
            label="Upcoming Calls" value={stats.calls}
            icon="📞" accent="linear-gradient(135deg,#f0a030,#e67e22)"
            subtext={stats.calls === 0 ? 'Book a 1-on-1 session' : 'View schedule'}
            delay={2}
          />
          <StatCard
            label="Certificates" value={stats.certs}
            icon="🏅" accent="linear-gradient(135deg,#5dade2,#3498db)"
            subtext={stats.certs === 0 ? 'Complete a course to earn' : 'Industry recognised'}
            delay={3}
          />
        </div>

        {/* ── My Courses ───────────────────────────────────────────────────── */}
        <motion.div {...stagger(4)}>
          <SectionTitle
            action={
              <Link to="/dashboard/courses" style={{ fontFamily: S.fontBody, fontSize: 13, color: S.rose, textDecoration: 'none', fontWeight: 500 }}>
                View all →
              </Link>
            }
          >
            My Courses
          </SectionTitle>

          {enrollments.length === 0 ? (
            <EmptyState
              emoji="📚"
              title="No courses yet"
              body="Browse our catalog and enroll in your first eyelash extension course to get started."
              cta={
                <Link to="/courses">
                  <button style={{
                    background: S.roseGrad, color: 'white', border: 'none',
                    borderRadius: 100, padding: '11px 28px', cursor: 'pointer',
                    fontFamily: S.fontBody, fontSize: 14, fontWeight: 500,
                    boxShadow: '0 4px 16px rgba(200,64,112,0.3)',
                  }}>
                    Explore Courses
                  </button>
                </Link>
              }
            />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16,
            }}>
              {enrollments.map((enr, idx) => (
                <CourseCard key={enr.id} enrollment={enr} index={idx} />
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Calls + Certificates row ──────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {/* Upcoming Calls */}
          <motion.div {...stagger(5)}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <h3 style={{ fontFamily: S.fontDisplay, fontSize: 18, fontWeight: 600, color: S.textPrimary, margin: 0 }}>
                  Upcoming Calls
                </h3>
                <Link to="/dashboard/calls" style={{ fontFamily: S.fontBody, fontSize: 12, color: S.rose, textDecoration: 'none' }}>
                  All calls →
                </Link>
              </div>

              {upcomingCalls.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>📅</div>
                  <p style={{ fontFamily: S.fontBody, fontSize: 13, color: S.textMuted, margin: '0 0 14px' }}>
                    No upcoming sessions
                  </p>
                  <Link to="/dashboard/calls">
                    <button style={{
                      background: S.roseBg, border: `1px solid ${S.roseBorder}`,
                      color: S.rose, fontFamily: S.fontBody, fontSize: 12, fontWeight: 500,
                      borderRadius: 100, padding: '7px 18px', cursor: 'pointer',
                    }}>
                      Book a session
                    </button>
                  </Link>
                </div>
              ) : (
                upcomingCalls.map(call => <CallRow key={call.id} call={call} />)
              )}
            </Card>
          </motion.div>

          {/* Certificates */}
          <motion.div {...stagger(6)}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <h3 style={{ fontFamily: S.fontDisplay, fontSize: 18, fontWeight: 600, color: S.textPrimary, margin: 0 }}>
                  Certificates
                </h3>
                <Link to="/dashboard/certificates" style={{ fontFamily: S.fontBody, fontSize: 12, color: S.rose, textDecoration: 'none' }}>
                  All →
                </Link>
              </div>

              {certificates.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🏅</div>
                  <p style={{ fontFamily: S.fontBody, fontSize: 13, color: S.textMuted, margin: 0 }}>
                    Complete a course to earn your first certificate
                  </p>
                </div>
              ) : (
                certificates.map(cert => <CertRow key={cert.id} cert={cert} />)
              )}
            </Card>
          </motion.div>
        </div>

        {/* ── Activity tip ─────────────────────────────────────────────────── */}
        {stats.courses > 0 && (
          <motion.div {...stagger(7)}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(200,64,112,0.06), rgba(240,160,48,0.04))',
              border: `1px solid rgba(200,64,112,0.14)`,
              borderRadius: S.cardRadius, padding: '20px 24px',
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16,
            }}>
              <div style={{ fontSize: 32 }}>✨</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h4 style={{ fontFamily: S.fontDisplay, fontSize: 18, fontWeight: 600, color: S.textPrimary, margin: '0 0 4px' }}>
                  Keep up the momentum
                </h4>
                <p style={{ fontFamily: S.fontBody, fontSize: 13, color: S.textMuted, margin: 0 }}>
                  {overallPct < 50
                    ? "You're building a strong foundation. Keep going — the best techniques are ahead."
                    : overallPct < 100
                    ? "You're more than halfway there. Your future clients are lucky already."
                    : "You've completed all your current courses! Time to level up with a new one."
                  }
                </p>
              </div>
              <Link to={enrollments[0] ? `/learn/${enrollments[0].courses?.slug}` : '/courses'}>
                <button style={{
                  background: S.roseGrad, color: 'white', border: 'none',
                  borderRadius: 100, padding: '10px 22px', cursor: 'pointer',
                  fontFamily: S.fontBody, fontSize: 13, fontWeight: 500,
                  boxShadow: '0 3px 12px rgba(200,64,112,0.3)',
                  whiteSpace: 'nowrap',
                }}>
                  {overallPct < 100 ? 'Continue Learning' : 'Explore More'}
                </button>
              </Link>
            </div>
          </motion.div>
        )}

      </div>
    </PageShell>
  );
}