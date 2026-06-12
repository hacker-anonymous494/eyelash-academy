import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/config/supabase';
import AdminLayout from './AdminLayout';
import { A, Card, Spinner, Empty, Btn, Badge, PageHeader, exportCSV, Table, Td } from './adminShared.jsx';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false })
      .then(({ data }) => { setStudents(data || []); setLoading(false); });
  }, []);

  const filtered = students.filter(s =>
    !search || (s.full_name || '').toLowerCase().includes(search.toLowerCase()) || (s.email || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => sortBy === 'newest' ? 0 : (a.full_name || '').localeCompare(b.full_name || ''));

  return (
    <AdminLayout>
      <PageHeader
        title="Students"
        subtitle={`${students.length} registered students`}
        action={<Btn variant="ghost" size="sm" onClick={() => exportCSV(students.map(s => ({ name: s.full_name, email: s.email, joined: s.created_at })), 'students.csv')}>↓ Export</Btn>}
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: `1px solid ${A.cardBorder}`, borderRadius: 100, padding: '8px 16px', flex: 1, minWidth: 200, maxWidth: 360 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={A.textMuted} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" style={{ background: 'none', border: 'none', outline: 'none', fontFamily: A.fontBody, fontSize: 13, color: A.textPrimary, flex: 1 }} />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontFamily: A.fontBody, fontSize: 12, color: A.textSecondary, background: 'white', border: `1px solid ${A.cardBorder}`, borderRadius: 100, padding: '8px 14px', cursor: 'pointer', outline: 'none' }}>
          <option value="newest">Newest first</option>
          <option value="az">A → Z</option>
        </select>
      </div>

      <Card>
        <Table
          headers={['Student', 'Email', 'Phone', 'Joined', 'Role']}
          loading={loading}
          emptyMsg="No students found."
          rows={filtered.map((s, i) => (
            <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              style={{ borderBottom: `1px solid ${A.cardBorder}` }}
              onMouseEnter={e => e.currentTarget.style.background = A.roseBg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#c84070,#f07090)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: A.fontBody, fontSize: 13, fontWeight: 600, color: 'white' }}>
                    {(s.full_name || s.email || '?')[0].toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 500 }}>{s.full_name || '—'}</span>
                </div>
              </Td>
              <Td><span style={{ color: A.textMuted }}>{s.email || '—'}</span></Td>
              <Td><span style={{ color: A.textMuted }}>{s.phone || '—'}</span></Td>
              <Td><span style={{ color: A.textMuted, fontSize: 12 }}>{new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></Td>
              <Td><Badge color={A.rose}>{s.role}</Badge></Td>
            </motion.tr>
          ))}
        />
      </Card>
    </AdminLayout>
  );
}