import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth/hooks/useAuth';
import PrimaryButton from '@/shared/components/PrimaryButton';
import GlassCard from '@/shared/components/GlassCard';

// ─── Design tokens ────────────────────────────────────────────────────────
const S = {
  cardBg: 'rgba(255,255,255,0.92)',
  cardBorder: 'rgba(220,160,180,0.2)',
  rose: '#c84070',
  roseLight: '#f0a0b8',
  gold: '#d4a030',
  fontDisplay: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  fontBody: "'DM Sans', system-ui, sans-serif",
  radius: 16,
  radiusSm: 12,
};

// ─── Skeleton loader ──────────────────────────────────────────────────────
function Skeleton({ width = '100%', height = 20, style }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: 'linear-gradient(90deg, #f0e0e8 25%, #faf0f4 50%, #f0e0e8 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...style,
      }}
    />
  );
}

// ─── Stat Card (compact but legible) ──────────────────────────────────────
function StatCard({ label, value, icon, gradient, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <div style={{
        background: S.cardBg,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${S.cardBorder}`,
        borderRadius: S.radiusSm,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        height: '100%',
        boxShadow: '0 2px 10px rgba(180,60,90,0.04)',
      }}>
        <div style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          color: '#fff',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <p style={{ fontFamily: S.fontBody, fontSize: 22, fontWeight: 700, color: '#1a0810', lineHeight: 1.1, margin: 0 }}>
            {value}
          </p>
          <p style={{ fontFamily: S.fontBody, fontSize: 12, color: '#9a6070', margin: 0 }}>
            {label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Course Card (richer, with cover placeholder and progress) ─────────────
function CourseCard({ enrollment, index }) {
  const { courses } = enrollment;
  const progress = enrollment.totalLessons > 0
    ? Math.round((enrollment.completedLessons / enrollment.totalLessons) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
    >
      <Link to={`/learn/${courses?.slug || '#'}`} style={{ textDecoration: 'none' }}>
        <div style={{
          background: S.cardBg,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${S.cardBorder}`,
          borderRadius: S.radius,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          cursor: 'pointer',
          transition: 'box-shadow 0.15s, transform 0.15s',
          boxShadow: '0 2px 10px rgba(180,60,90,0.04)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(180,60,90,0.1)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = '0 2px 10px rgba(180,60,90,0.04)';
          e.currentTarget.style.transform = 'none';
        }}
        >
          {/* Cover image placeholder */}
          <div style={{
            width: '100%',
            height: 100,
            borderRadius: S.radiusSm,
            background: 'linear-gradient(135deg, #fce4ec, #f8bbd0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
          }}>
            📘
          </div>
          <div>
            <h3 style={{
              fontFamily: S.fontDisplay,
              fontSize: 16,
              fontWeight: 600,
              color: '#1a0810',
              margin: '0 0 4px',
            }}>
              {courses?.title || 'Untitled Course'}
            </h3>
            <p style={{ fontSize: 12, color: '#9a6070', margin: 0 }}>
              Enrolled {new Date(enrollment.purchased_at).toLocaleDateString()}
            </p>
          </div>
          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 5, background: '#f0e0e8', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8 }}
                style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #c84070, #f0a030)' }}
              />
            </div>
            <span style={{ fontSize: 12, color: '#9a6070', fontWeight: 500 }}>
              {enrollment.completedLessons}/{enrollment.totalLessons}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PrimaryButton style={{ padding: '6px 16px', fontSize: 12 }}>
              Continue
            </PrimaryButton>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [upcomingCalls, setUpcomingCalls] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState({ courses: 0, completedLessons: 0, calls: 0, certs: 0 });

  useEffect(() => {
    if (!user) return;

    async function fetchDashboard() {
      setLoading(true);
      const today = new Date().toISOString();

      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('*, courses(*)')
        .eq('student_id', user.id)
        .eq('status', 'active');

      const enriched = [];
      if (enrollData) {
        for (const enr of enrollData) {
          if (!enr.courses) continue;

          const { data: mods } = await supabase
            .from('modules')
            .select('id')
            .eq('course_id', enr.course_id);
          const moduleIds = mods?.map(m => m.id) || [];
          let totalLessons = 0, completedLessons = 0;

          if (moduleIds.length) {
            const { count } = await supabase
              .from('lessons')
              .select('id', { count: 'exact', head: true })
              .in('module_id', moduleIds);
            totalLessons = count || 0;

            const { data: lessonsData } = await supabase
              .from('lessons')
              .select('id')
              .in('module_id', moduleIds);

            if (lessonsData?.length) {
              const lessonIds = lessonsData.map(l => l.id);
              const { data: completed } = await supabase
                .from('lesson_progress')
                .select('lesson_id')
                .eq('student_id', user.id)
                .in('lesson_id', lessonIds)
                .eq('passed_quiz', true);
              completedLessons = completed?.length || 0;
            }
          }

          enriched.push({ ...enr, totalLessons, completedLessons });
        }
      }

      const { data: callsData } = await supabase
        .from('video_call_sessions')
        .select('*')
        .eq('student_id', user.id)
        .gte('scheduled_at', today)
        .order('scheduled_at')
        .limit(3);

      const { data: certsData } = await supabase
        .from('certificates')
        .select('*, courses(title)')
        .eq('student_id', user.id)
        .order('issued_at', { ascending: false })
        .limit(3);

      const totalCompleted = enriched.reduce((sum, e) => sum + e.completedLessons, 0);

      setEnrollments(enriched);
      setUpcomingCalls(callsData || []);
      setCertificates(certsData || []);
      setStats({
        courses: enriched.length,
        completedLessons: totalCompleted,
        calls: callsData?.length || 0,
        certs: certsData?.length || 0,
      });
      setLoading(false);
    }

    fetchDashboard();
  }, [user]);

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '24px', height: '100%' }}>
        <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
          <Skeleton width="30%" height={80} />
          <Skeleton width="30%" height={80} />
          <Skeleton width="30%" height={80} />
        </div>
        <Skeleton width="100%" height={200} style={{ marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
          <div style={{ gridColumn: 'span 8' }}>
            <Skeleton height={300} />
          </div>
          <div style={{ gridColumn: 'span 4' }}>
            <Skeleton height={300} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', height: '100%' }}>
      {/* ── Welcome & Quick Stats ────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{
            fontFamily: S.fontDisplay,
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            fontWeight: 600,
            color: '#1a0810',
            margin: 0,
            lineHeight: 1.2,
          }}>
            Welcome back,{' '}
            <span style={{
              background: 'linear-gradient(135deg, #c84070, #f0a030)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {profile?.full_name || 'Artist'}
            </span>
          </h1>
          <p style={{ color: '#9a6070', fontSize: 14, margin: '4px 0 0' }}>
            {stats.completedLessons} lessons completed · {stats.courses} courses in progress
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/courses">
            <PrimaryButton style={{
              background: 'transparent',
              color: S.rose,
              border: `1px solid ${S.cardBorder}`,
              padding: '8px 18px',
              fontSize: 13,
            }}>
              Browse Courses
            </PrimaryButton>
          </Link>
          <Link to="/dashboard/book-call">
            <PrimaryButton style={{ padding: '8px 18px', fontSize: 13 }}>
              Book a Call
            </PrimaryButton>
          </Link>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        <StatCard label="Enrolled Courses" value={stats.courses} icon="📚" gradient="linear-gradient(135deg, #f7708e, #c84070)" delay={0} />
        <StatCard label="Lessons Passed" value={stats.completedLessons} icon="✅" gradient="linear-gradient(135deg, #48c878, #2ecc71)" delay={0.05} />
        <StatCard label="Upcoming Calls" value={stats.calls} icon="📞" gradient="linear-gradient(135deg, #f0a030, #e67e22)" delay={0.1} />
        <StatCard label="Certificates" value={stats.certs} icon="📜" gradient="linear-gradient(135deg, #5dade2, #3498db)" delay={0.15} />
      </div>

      {/* ── Main Content Grid ────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 24,
      }}>
        {/* Left: My Courses (8 cols) */}
        <div style={{ gridColumn: 'span 8', minWidth: 0 }}>
          <h2 style={{
            fontFamily: S.fontDisplay,
            fontSize: '1.2rem',
            fontWeight: 600,
            color: '#1a0810',
            margin: '0 0 16px',
          }}>
            My Courses
          </h2>
          {enrollments.length === 0 ? (
            <GlassCard style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: '#9a6070', fontSize: 14, marginBottom: 16 }}>
                You haven't enrolled in any courses yet.
              </p>
              <Link to="/courses">
                <PrimaryButton>Explore Courses</PrimaryButton>
              </Link>
            </GlassCard>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
            }}>
              {enrollments.map((enr, idx) => (
                <CourseCard key={enr.id} enrollment={enr} index={idx} />
              ))}
            </div>
          )}
        </div>

        {/* Right: Calls & Certificates (4 cols) */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          {/* Upcoming Calls */}
          <GlassCard style={{ padding: 20 }}>
            <h3 style={{
              fontFamily: S.fontBody,
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#9a6070',
              margin: '0 0 12px',
            }}>
              📞 Upcoming Calls
            </h3>
            {upcomingCalls.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9a6070', margin: 0 }}>
                No calls scheduled.{' '}
                <Link to="/dashboard/book-call" style={{ color: S.rose }}>Book one</Link>
              </p>
            ) : (
              upcomingCalls.map(call => (
                <div key={call.id} style={{
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                  fontSize: 13,
                }}>
                  <p style={{ fontWeight: 500, margin: 0 }}>
                    {new Date(call.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  <p style={{ color: '#9a6070', margin: '2px 0 0' }}>{call.status}</p>
                </div>
              ))
            )}
          </GlassCard>

          {/* Certificates */}
          <GlassCard style={{ padding: 20 }}>
            <h3 style={{
              fontFamily: S.fontBody,
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#9a6070',
              margin: '0 0 12px',
            }}>
              📜 Recent Certificates
            </h3>
            {certificates.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9a6070', margin: 0 }}>No certificates earned yet.</p>
            ) : (
              certificates.map(cert => (
                <div key={cert.id} style={{
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                  fontSize: 13,
                }}>
                  <p style={{ fontWeight: 500, margin: 0 }}>{cert.courses?.title}</p>
                  <p style={{ color: '#9a6070', margin: '2px 0 0' }}>
                    {new Date(cert.issued_at).toLocaleDateString()}
                    {' '}
                    <a
                      href={cert.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: S.rose, textDecoration: 'underline' }}
                    >
                      View
                    </a>
                  </p>
                </div>
              ))
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}