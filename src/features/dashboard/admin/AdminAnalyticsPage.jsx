import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/config/supabase';
import AdminLayout from './AdminLayout';
import { A, Card, Spinner, Skeleton, Btn, PageHeader, exportCSV } from './adminShared.jsx';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = ['#c84070', '#e87090', '#f0a0b8', '#d4a030', '#3498db', '#2ecc71', '#9b59b6'];

const tooltipStyle = {
  background: 'white', border: `1px solid rgba(200,64,112,0.15)`,
  borderRadius: 10, fontSize: 12, fontFamily: "'DM Sans',system-ui,sans-serif",
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
};

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [revenueData, setRevenueData] = useState([]);
  const [enrollmentData, setEnrollmentData] = useState([]);
  const [coursePopularity, setCoursePopularity] = useState([]);
  const [completionRates, setCompletionRates] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalStudents: 0, totalCerts: 0, avgCompletion: 0 });

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const { data: orders } = await supabase.from('orders').select('*, courses(title), profiles(full_name)').eq('status', 'completed').order('created_at', { ascending: false });
      const { data: enrollments } = await supabase.from('enrollments').select('*, courses(title)').order('purchased_at', { ascending: false });
      const { data: courses } = await supabase.from('courses').select('id, title');
      const { data: certs } = await supabase.from('certificates').select('course_id');
      const { data: allEnrollments } = await supabase.from('enrollments').select('course_id');

      const allOrders = orders || [];
      setRecentOrders(allOrders.slice(0, 10));
      setSummary({
        totalRevenue: allOrders.reduce((s, o) => s + o.amount_cents, 0) / 100,
        totalStudents: [...new Set(allOrders.map(o => o.student_id))].length,
        totalCerts: certs?.length || 0,
        avgCompletion: allEnrollments?.length > 0 ? Math.round(((certs?.length || 0) / allEnrollments.length) * 100) : 0,
      });

      // Revenue over time
      const revMap = new Map();
      allOrders.forEach(o => {
        const d = new Date(o.created_at);
        let key = period === 'daily' ? d.toISOString().slice(0, 10) : period === 'weekly' ? (() => { const s = new Date(d); s.setDate(d.getDate() - d.getDay()); return s.toISOString().slice(0, 10); })() : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        revMap.set(key, (revMap.get(key) || 0) + o.amount_cents / 100);
      });
      setRevenueData([...revMap].map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30));

      // Enrollment trend
      const enrMap = new Map();
      (enrollments || []).forEach(e => {
        const d = new Date(e.purchased_at);
        let key = period === 'daily' ? d.toISOString().slice(0, 10) : period === 'weekly' ? (() => { const s = new Date(d); s.setDate(d.getDate() - d.getDay()); return s.toISOString().slice(0, 10); })() : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        enrMap.set(key, (enrMap.get(key) || 0) + 1);
      });
      setEnrollmentData([...enrMap].map(([date, students]) => ({ date, students })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30));

      // Course revenue share
      const cMap = new Map();
      allOrders.forEach(o => { const n = o.courses?.title || 'Unknown'; cMap.set(n, (cMap.get(n) || 0) + o.amount_cents / 100); });
      setCoursePopularity([...cMap].map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value).slice(0, 6));

      // Completion rates
      setCompletionRates((courses || []).map(c => {
        const enrolled = (allEnrollments || []).filter(e => e.course_id === c.id).length;
        const certified = (certs || []).filter(cert => cert.course_id === c.id).length;
        return { name: c.title, enrolled, certified, rate: enrolled > 0 ? Math.round((certified / enrolled) * 100) : 0 };
      }).sort((a, b) => b.enrolled - a.enrolled));

      setLoading(false);
    }
    fetchAll();
  }, [period]);

  const summaryCards = [
    { label: 'Total Revenue', value: `$${summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`, icon: '💰', color: A.rose },
    { label: 'Paying Students', value: summary.totalStudents, icon: '👩‍🎓', color: A.blue },
    { label: 'Certificates Issued', value: summary.totalCerts, icon: '🏅', color: A.gold },
    { label: 'Avg. Completion', value: `${summary.avgCompletion}%`, icon: '✅', color: A.green },
  ];

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <PageHeader title="Analytics" subtitle="Revenue, enrollment, and student performance data" />
          <div style={{ display: 'flex', gap: 8 }}>
            {['daily', 'weekly', 'monthly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                fontFamily: A.fontBody, fontSize: 12, fontWeight: 500, textTransform: 'capitalize',
                background: period === p ? A.roseGrad : 'white',
                color: period === p ? 'white' : A.textMuted,
                border: period === p ? 'none' : `1px solid ${A.cardBorder}`,
                borderRadius: 100, padding: '7px 16px', cursor: 'pointer',
                boxShadow: period === p ? '0 2px 8px rgba(200,64,112,0.28)' : 'none',
              }}>{p}</button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14 }}>
          {summaryCards.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{s.icon}</div>
                {loading ? <Skeleton height={28} style={{ marginBottom: 4 }} /> : (
                  <p style={{ fontFamily: A.fontDisplay, fontSize: 28, fontWeight: 600, color: s.color, margin: '0 0 4px', lineHeight: 1 }}>{s.value}</p>
                )}
                <p style={{ fontFamily: A.fontBody, fontSize: 11.5, color: A.textMuted, margin: 0 }}>{s.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Revenue trend */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontFamily: A.fontDisplay, fontSize: 20, fontWeight: 600, color: A.textPrimary, margin: 0 }}>Revenue Trend</h3>
            <Btn variant="ghost" size="sm" onClick={() => exportCSV(revenueData, `revenue_${period}.csv`)}>↓ CSV</Btn>
          </div>
          {loading ? <Skeleton height={260} /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke={A.cardBorder} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: A.fontBody }} stroke={A.cardBorder} />
                <YAxis tick={{ fontSize: 11, fontFamily: A.fontBody }} stroke={A.cardBorder} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke={A.rose} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Enrollment + pie */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: A.fontDisplay, fontSize: 20, fontWeight: 600, color: A.textPrimary, margin: 0 }}>New Enrollments</h3>
              <Btn variant="ghost" size="sm" onClick={() => exportCSV(enrollmentData, `enrollments_${period}.csv`)}>↓ CSV</Btn>
            </div>
            {loading ? <Skeleton height={220} /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={enrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={A.cardBorder} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={A.cardBorder} />
                  <YAxis tick={{ fontSize: 11 }} stroke={A.cardBorder} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="students" fill={A.rose} radius={[4, 4, 0, 0]} name="Enrollments" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: A.fontDisplay, fontSize: 20, fontWeight: 600, color: A.textPrimary, margin: 0 }}>Revenue by Course</h3>
              <Btn variant="ghost" size="sm" onClick={() => exportCSV(coursePopularity, 'course_revenue.csv')}>↓ CSV</Btn>
            </div>
            {loading ? <Skeleton height={220} /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={coursePopularity} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name">
                    {coursePopularity.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v}`, 'Revenue']} />
                  <Legend wrapperStyle={{ fontFamily: A.fontBody, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Completion rates */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontFamily: A.fontDisplay, fontSize: 20, fontWeight: 600, color: A.textPrimary, margin: 0 }}>Course Completion Rates</h3>
            <Btn variant="ghost" size="sm" onClick={() => exportCSV(completionRates, 'completion.csv')}>↓ CSV</Btn>
          </div>
          {loading ? <Skeleton height={200} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {completionRates.map((c, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontFamily: A.fontBody, fontSize: 13, color: A.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{c.name}</span>
                    <span style={{ fontFamily: A.fontBody, fontSize: 12, color: A.textMuted, flexShrink: 0 }}>{c.certified}/{c.enrolled} · {c.rate}%</span>
                  </div>
                  <div style={{ height: 6, background: A.cardBorder, borderRadius: 3, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${c.rate}%` }} transition={{ duration: 0.8, delay: i * 0.05 }}
                      style={{ height: '100%', borderRadius: 3, background: c.rate > 70 ? 'linear-gradient(90deg,#2ecc71,#27ae60)' : c.rate > 40 ? `linear-gradient(90deg,${A.rose},#f07090)` : 'linear-gradient(90deg,#e74c3c,#c0392b)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent orders table */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontFamily: A.fontDisplay, fontSize: 20, fontWeight: 600, color: A.textPrimary, margin: 0 }}>Recent Orders</h3>
            <Btn variant="ghost" size="sm" onClick={() => exportCSV(recentOrders.map(o => ({ student: o.profiles?.full_name, course: o.courses?.title, amount: o.amount_cents / 100, date: o.created_at })), 'recent_orders.csv')}>↓ Export</Btn>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: A.fontBody, fontSize: 13 }}>
              <thead>
                <tr>{['Student', 'Course', 'Amount', 'Date'].map((h, i) => <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: A.fontBody, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: A.textMuted, borderBottom: `1px solid ${A.cardBorder}` }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {loading ? [...Array(5)].map((_, i) => <tr key={i}>{[...Array(4)].map((_, j) => <td key={j} style={{ padding: '12px 14px' }}><Skeleton height={14} /></td>)}</tr>) :
                recentOrders.map((o, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${A.cardBorder}` }}
                    onMouseEnter={e => e.currentTarget.style.background = A.roseBg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px', fontWeight: 500 }}>{o.profiles?.full_name || '—'}</td>
                    <td style={{ padding: '12px 14px', color: A.textMuted, maxWidth: 200 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{o.courses?.title || '—'}</span></td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: A.rose }}>${(o.amount_cents / 100).toFixed(2)}</td>
                    <td style={{ padding: '12px 14px', color: A.textMuted, fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}