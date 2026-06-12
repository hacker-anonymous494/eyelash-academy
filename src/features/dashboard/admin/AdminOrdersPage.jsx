import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/config/supabase';
import AdminLayout from './AdminLayout';
import { A, Card, Spinner, Empty, Btn, Badge, PageHeader, exportCSV, Table, Td } from './adminShared.jsx';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    supabase.from('orders').select('*, profiles(full_name,email), courses(title)').order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders(data || []);
        setTotalRevenue((data || []).filter(o => o.status === 'completed').reduce((s, o) => s + o.amount_cents, 0) / 100);
        setLoading(false);
      });
  }, []);

  const statusColor = { completed: A.green, pending: A.gold, cancelled: A.red, failed: A.red };
  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !search || (o.profiles?.full_name || '').toLowerCase().includes(q) || (o.courses?.title || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout>
      <PageHeader
        title="Orders"
        subtitle={`$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })} total revenue · ${orders.filter(o => o.status === 'completed').length} completed orders`}
        action={<Btn variant="ghost" size="sm" onClick={() => exportCSV(filtered.map(o => ({ student: o.profiles?.full_name, course: o.courses?.title, amount: o.amount_cents / 100, status: o.status, date: o.created_at })), 'orders.csv')}>↓ Export CSV</Btn>}
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: `1px solid ${A.cardBorder}`, borderRadius: 100, padding: '8px 16px', flex: 1, minWidth: 200, maxWidth: 320 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={A.textMuted} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student or course…" style={{ background: 'none', border: 'none', outline: 'none', fontFamily: A.fontBody, fontSize: 13, color: A.textPrimary, flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'completed', 'pending', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              fontFamily: A.fontBody, fontSize: 12, fontWeight: 500, textTransform: 'capitalize',
              background: statusFilter === s ? A.roseGrad : 'white',
              color: statusFilter === s ? 'white' : A.textMuted,
              border: statusFilter === s ? 'none' : `1px solid ${A.cardBorder}`,
              borderRadius: 100, padding: '7px 14px', cursor: 'pointer',
              boxShadow: statusFilter === s ? '0 2px 8px rgba(200,64,112,0.28)' : 'none',
            }}>{s}</button>
          ))}
        </div>
      </div>

      <Card>
        <Table
          headers={['Student', 'Course', 'Amount', 'Provider', 'Status', 'Date']}
          loading={loading}
          emptyMsg="No orders found."
          rows={filtered.map((o, i) => (
            <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              style={{ borderBottom: `1px solid ${A.cardBorder}` }}
              onMouseEnter={e => e.currentTarget.style.background = A.roseBg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Td><div><p style={{ fontWeight: 500, margin: 0 }}>{o.profiles?.full_name || '—'}</p><p style={{ fontSize: 11, color: A.textMuted, margin: 0 }}>{o.profiles?.email}</p></div></Td>
              <Td style={{ maxWidth: 200 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{o.courses?.title || '—'}</span></Td>
              <Td><span style={{ fontWeight: 700, color: A.rose }}>${(o.amount_cents / 100).toFixed(2)}</span></Td>
              <Td><Badge color={A.blue}>{o.provider}</Badge></Td>
              <Td><Badge color={statusColor[o.status] || A.textMuted}>{o.status}</Badge></Td>
              <Td><span style={{ color: A.textMuted, fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString()}</span></Td>
            </motion.tr>
          ))}
        />
      </Card>
    </AdminLayout>
  );
}