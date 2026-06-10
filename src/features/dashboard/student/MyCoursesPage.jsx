import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { S, Skeleton, PageShell, SectionTitle, EmptyState, stagger } from './dashboardShared';

// ─── Search icon ──────────────────────────────────────────────────────────────
function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: S.fontBody, fontSize: 12, fontWeight: 500,
        background: active ? S.roseGrad : 'transparent',
        color: active ? 'white' : S.textMuted,
        border: active ? 'none' : `1px solid ${S.cardBorder}`,
        borderRadius: 100, padding: '6px 16px', cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: active ? '0 3px 10px rgba(200,64,112,0.28)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

// ─── Course card (full) ───────────────────────────────────────────────────────
function CourseCard({ enrollment, index }) {
  const { courses } = enrollment;
  const progress = enrollment.totalLessons > 0
    ? Math.round((enrollment.completedLessons / enrollment.totalLessons) * 100)
    : 0;

  const gradients = [
    'linear-gradient(135deg,#fce4ec,#f8bbd0,#f48fb1)',
    'linear-gradient(135deg,#fff3e0,#ffe0b2,#ffb74d)',
    'linear-gradient(135deg,#f3e5f5,#e1bee7,#ce93d8)',
    'linear-gradient(135deg,#e8f5e9,#c8e6c9,#81c784)',
    'linear-gradient(135deg,#e3f2fd,#bbdefb,#64b5f6)',
    'linear-gradient(135deg,#fce4ec,#f8bbd0,#f48fb1)',
  ];

  const statusLabel = progress === 100 ? 'Complete' : progress > 0 ? 'In progress' : 'Not started';
  const statusColor = progress === 100 ? S.green : progress > 0 ? S.rose : S.textMuted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <div style={{
        background: S.cardBg, border: `1px solid ${S.cardBorder}`,
        borderRadius: S.cardRadius, overflow: 'hidden', boxShadow: S.cardShadow,
        display: 'flex', flexDirection: 'column',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = S.cardShadowHover; e.currentTarget.style.transform = 'translateY(-3px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = S.cardShadow; e.currentTarget.style.transform = 'none'; }}
      >
        {/* Cover */}
        <div style={{
          height: 130, flexShrink: 0,
          background: courses?.cover_image_url
            ? `url(${courses.cover_image_url}) center/cover no-repeat`
            : gradients[index % gradients.length],
          position: 'relative',
        }}>
          {!courses?.cover_image_url && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, opacity: 0.55,
            }}>📚</div>
          )}

          {/* Status badge */}
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: progress === 100
              ? 'rgba(46,204,113,0.92)'
              : progress > 0
              ? 'rgba(200,64,112,0.88)'
              : 'rgba(0,0,0,0.5)',
            color: 'white', fontFamily: S.fontBody, fontSize: 10, fontWeight: 600,
            padding: '3px 9px', borderRadius: 100, letterSpacing: '0.04em',
          }}>
            {progress === 100 ? '✓ Complete' : progress > 0 ? `${progress}%` : 'Start'}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
          <div>
            <h3 style={{
              fontFamily: S.fontDisplay, fontSize: 17, fontWeight: 600,
              color: S.textPrimary, margin: '0 0 4px', lineHeight: 1.3,
            }}>
              {courses?.title || 'Untitled Course'}
            </h3>
            {courses?.description && (
              <p style={{
                fontFamily: S.fontBody, fontSize: 12.5, color: S.textMuted,
                margin: 0, lineHeight: 1.5,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {courses.description}
              </p>
            )}
          </div>

          {/* Progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontFamily: S.fontBody, fontSize: 11, color: statusColor, fontWeight: 500 }}>
                {statusLabel}
              </span>
              <span style={{ fontFamily: S.fontBody, fontSize: 11, color: S.textMuted }}>
                {enrollment.completedLessons}/{enrollment.totalLessons} lessons
              </span>
            </div>
            <div style={{ height: 5, background: '#f0e0e8', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.9, delay: index * 0.06 + 0.3 }}
                style={{
                  height: '100%', borderRadius: 3,
                  background: progress === 100
                    ? 'linear-gradient(90deg,#2ecc71,#27ae60)'
                    : 'linear-gradient(90deg,#c84070,#f0a030)',
                }}
              />
            </div>
          </div>

          {/* Meta row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 6, marginTop: 'auto', borderTop: `1px solid ${S.cardBorder}`,
          }}>
            <span style={{ fontFamily: S.fontBody, fontSize: 11, color: S.textMuted }}>
              Enrolled {new Date(enrollment.purchased_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
            <Link
              to={`/learn/${courses?.slug || '#'}`}
              style={{
                fontFamily: S.fontBody, fontSize: 12, fontWeight: 600,
                color: 'white', textDecoration: 'none',
                background: S.roseGrad, borderRadius: 100,
                padding: '6px 16px',
                boxShadow: '0 2px 8px rgba(200,64,112,0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(200,64,112,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(200,64,112,0.3)'; }}
            >
              {progress > 0 ? 'Continue' : 'Start'}
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Skeleton grid ────────────────────────────────────────────────────────────
function CoursesSkeleton() {
  return (
    <PageShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Skeleton height={36} radius={10} style={{ maxWidth: 260 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} width={90} height={32} radius={100} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {[...Array(6)].map((_, i) => <Skeleton key={i} height={340} radius={16} />)}
        </div>
      </div>
    </PageShell>
  );
}

// ─── MyCoursesPage ────────────────────────────────────────────────────────────
export default function MyCoursesPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | in-progress | complete | not-started
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // recent | progress | az

  useEffect(() => {
    async function fetchEnrollments() {
      if (!user) return;
      setLoading(true);

      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('*, courses(*)')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .order('purchased_at', { ascending: false });

      if (!enrollData) { setLoading(false); return; }

      const courseIds = enrollData.map(e => e.course_id);
      if (courseIds.length === 0) { setEnrollments([]); setLoading(false); return; }

      // Batch fetch progress
      const { data: allMods } = await supabase.from('modules').select('id, course_id').in('course_id', courseIds);
      const allModIds = (allMods || []).map(m => m.id);
      const { data: allLessons } = await supabase.from('lessons').select('id, module_id').in('module_id', allModIds);
      const allLessonIds = (allLessons || []).map(l => l.id);

      const { data: allProgress } = await supabase
        .from('lesson_progress')
        .select('lesson_id, passed_quiz')
        .eq('student_id', user.id)
        .in('lesson_id', allLessonIds);

      const modToCourse = {};
      (allMods || []).forEach(m => { modToCourse[m.id] = m.course_id; });
      const lessonToMod = {};
      (allLessons || []).forEach(l => { lessonToMod[l.id] = l.module_id; });

      const courseTotal = {};
      const courseCompleted = {};
      courseIds.forEach(id => { courseTotal[id] = 0; courseCompleted[id] = 0; });
      (allLessons || []).forEach(l => {
        const cid = modToCourse[l.module_id];
        if (cid) courseTotal[cid] = (courseTotal[cid] || 0) + 1;
      });
      (allProgress || []).forEach(p => {
        const cid = modToCourse[lessonToMod[p.lesson_id]];
        if (cid && p.passed_quiz) courseCompleted[cid] = (courseCompleted[cid] || 0) + 1;
      });

      const enriched = enrollData.map(enr => ({
        ...enr,
        totalLessons: courseTotal[enr.course_id] || 0,
        completedLessons: courseCompleted[enr.course_id] || 0,
      }));

      setEnrollments(enriched);
      setLoading(false);
    }
    fetchEnrollments();
  }, [user]);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...enrollments];

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.courses?.title?.toLowerCase().includes(q));
    }

    // Status filter
    if (filter === 'complete') list = list.filter(e => e.completedLessons === e.totalLessons && e.totalLessons > 0);
    else if (filter === 'in-progress') list = list.filter(e => e.completedLessons > 0 && e.completedLessons < e.totalLessons);
    else if (filter === 'not-started') list = list.filter(e => e.completedLessons === 0);

    // Sort
    if (sortBy === 'progress') list.sort((a, b) => {
      const pA = a.totalLessons > 0 ? a.completedLessons / a.totalLessons : 0;
      const pB = b.totalLessons > 0 ? b.completedLessons / b.totalLessons : 0;
      return pB - pA;
    });
    else if (sortBy === 'az') list.sort((a, b) => (a.courses?.title || '').localeCompare(b.courses?.title || ''));
    // 'recent' = default (already sorted by purchased_at)

    return list;
  }, [enrollments, filter, search, sortBy]);

  if (loading) return <CoursesSkeleton />;

  return (
    <PageShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <motion.div {...stagger(0)} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <h1 style={{ fontFamily: S.fontDisplay, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 600, color: S.textPrimary, margin: 0 }}>
              My Courses
            </h1>
            <p style={{ fontFamily: S.fontBody, fontSize: 13, color: S.textMuted, margin: '5px 0 0' }}>
              {enrollments.length} course{enrollments.length !== 1 ? 's' : ''} enrolled
            </p>
          </div>
          <Link to="/courses">
            <button style={{
              background: S.roseGrad, color: 'white', border: 'none',
              borderRadius: 100, padding: '10px 22px', cursor: 'pointer',
              fontFamily: S.fontBody, fontSize: 13, fontWeight: 500,
              boxShadow: '0 3px 12px rgba(200,64,112,0.3)',
            }}>
              + Explore More
            </button>
          </Link>
        </motion.div>

        {enrollments.length > 0 && (
          <motion.div {...stagger(1)} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: S.cardBg, border: `1px solid ${S.cardBorder}`,
              borderRadius: 100, padding: '7px 16px',
              flex: 1, minWidth: 180, maxWidth: 300,
            }}>
              <span style={{ color: S.textMuted, display: 'flex', flexShrink: 0 }}><SearchIcon /></span>
              <input
                type="text"
                placeholder="Search courses..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  fontFamily: S.fontBody, fontSize: 13, color: S.textPrimary,
                  flex: 1, minWidth: 0,
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: S.textMuted, fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
                }}>×</button>
              )}
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'in-progress', label: 'In Progress' },
                { key: 'complete', label: 'Complete' },
                { key: 'not-started', label: 'Not Started' },
              ].map(f => (
                <FilterPill key={f.key} label={f.label} active={filter === f.key} onClick={() => setFilter(f.key)} />
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                fontFamily: S.fontBody, fontSize: 12, color: S.textSecondary,
                background: S.cardBg, border: `1px solid ${S.cardBorder}`,
                borderRadius: 100, padding: '7px 14px', cursor: 'pointer',
                outline: 'none', appearance: 'none',
              }}
            >
              <option value="recent">Most Recent</option>
              <option value="progress">By Progress</option>
              <option value="az">A → Z</option>
            </select>
          </motion.div>
        )}

        {/* Grid */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {enrollments.length === 0 ? (
                <EmptyState
                  emoji="📚"
                  title="No courses yet"
                  body="Enroll in a course to start your eyelash extension journey."
                  cta={
                    <Link to="/courses">
                      <button style={{
                        background: S.roseGrad, color: 'white', border: 'none',
                        borderRadius: 100, padding: '11px 28px', cursor: 'pointer',
                        fontFamily: S.fontBody, fontSize: 14, fontWeight: 500,
                        boxShadow: '0 4px 16px rgba(200,64,112,0.3)',
                      }}>
                        Browse Catalog
                      </button>
                    </Link>
                  }
                />
              ) : (
                <div style={{
                  textAlign: 'center', padding: '48px 24px',
                  background: S.cardBg, border: `1px solid ${S.cardBorder}`,
                  borderRadius: S.cardRadius,
                }}>
                  <p style={{ fontFamily: S.fontBody, fontSize: 14, color: S.textMuted, margin: '0 0 12px' }}>
                    No courses match your filters.
                  </p>
                  <button onClick={() => { setFilter('all'); setSearch(''); }} style={{
                    background: S.roseBg, border: `1px solid ${S.roseBorder}`,
                    color: S.rose, fontFamily: S.fontBody, fontSize: 12,
                    borderRadius: 100, padding: '7px 18px', cursor: 'pointer',
                  }}>
                    Clear filters
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <div
              key="grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}
            >
              {filtered.map((enr, idx) => (
                <CourseCard key={enr.id} enrollment={enr} index={idx} />
              ))}
            </div>
          )}
        </AnimatePresence>

      </div>
    </PageShell>
  );
}