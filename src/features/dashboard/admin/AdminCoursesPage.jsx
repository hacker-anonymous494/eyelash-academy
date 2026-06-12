import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/config/supabase';
import AdminLayout from './AdminLayout';
import { A, Card, Spinner, Empty, Btn, Badge, PageHeader } from './adminShared.jsx';

function CourseCard({ course, onToggle, index }) {
  const published = course.status === 'published';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }}>
      <Card style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }} hover>
        {/* Cover thumb */}
        <div style={{
          width: 56, height: 56, borderRadius: 12, flexShrink: 0,
          background: course.cover_image_url ? `url(${course.cover_image_url}) center/cover` : 'linear-gradient(135deg,#fce4ec,#f48fb1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>
          {!course.cover_image_url && '📚'}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <h3 style={{ fontFamily: A.fontDisplay, fontSize: 17, fontWeight: 600, color: A.textPrimary, margin: 0 }}>{course.title}</h3>
            <Badge color={published ? A.green : A.gold}>{published ? 'Published' : 'Draft'}</Badge>
          </div>
          <p style={{ fontFamily: A.fontBody, fontSize: 12, color: A.textMuted, margin: 0 }}>
            ${(course.price_cents / 100).toFixed(0)} · {course.slug}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Btn variant="ghost" size="sm" onClick={() => onToggle(course)}>
            {published ? 'Unpublish' : 'Publish'}
          </Btn>
          <Link to={`/admin/courses/${course.id}`}>
            <Btn variant="primary" size="sm">Edit</Btn>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    supabase.from('courses').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setCourses(data || []); setLoading(false); });
  }, []);

  const toggleStatus = async (course) => {
    const s = course.status === 'published' ? 'draft' : 'published';
    await supabase.from('courses').update({ status: s }).eq('id', course.id);
    setCourses(p => p.map(c => c.id === course.id ? { ...c, status: s } : c));
  };

  const filtered = courses.filter(c => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <AdminLayout>
      <PageHeader
        title="Courses"
        subtitle={`${courses.length} total · ${courses.filter(c => c.status === 'published').length} published`}
        action={<Link to="/admin/courses/new"><Btn variant="primary">+ New Course</Btn></Link>}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: `1px solid ${A.cardBorder}`, borderRadius: 100, padding: '8px 16px', flex: '1', minWidth: 180, maxWidth: 320 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={A.textMuted} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses…" style={{ background: 'none', border: 'none', outline: 'none', fontFamily: A.fontBody, fontSize: 13, color: A.textPrimary, flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'published', 'draft'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontFamily: A.fontBody, fontSize: 12, fontWeight: 500,
              background: filter === f ? A.roseGrad : 'white',
              color: filter === f ? 'white' : A.textMuted,
              border: filter === f ? 'none' : `1px solid ${A.cardBorder}`,
              borderRadius: 100, padding: '7px 16px', cursor: 'pointer',
              boxShadow: filter === f ? '0 2px 8px rgba(200,64,112,0.28)' : 'none',
              textTransform: 'capitalize',
            }}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={40} /></div>
      ) : filtered.length === 0 ? (
        <Empty emoji="📚" title="No courses found" body={search ? 'Try a different search term.' : 'Create your first course to get started.'} action={<Link to="/admin/courses/new"><Btn variant="primary">+ New Course</Btn></Link>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((c, i) => <CourseCard key={c.id} course={c} onToggle={toggleStatus} index={i} />)}
        </div>
      )}
    </AdminLayout>
  );
}