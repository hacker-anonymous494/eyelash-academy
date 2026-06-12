import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/config/supabase';
import AdminLayout from './AdminLayout';
import { A, StatCard, Card, Spinner, Skeleton, Btn, exportCSV } from './adminShared.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const stagger = (i) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: i * 0.07 } });

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ courses: 0, students: 0, orders: 0, revenue: 0, newStudentsMonth: 0, activeCalls: 0 });
  const [revenueData, setRevenueData] = useState([]);
  const [topCourses, setTopCourses] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    async function fetch() {
      const [
        { count: courses },
        { count: students },
        { data: orders },
        { count: activeCalls },
      ] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('orders').select('amount_cents,created_at,student_id,course_id,profiles(full_name),courses(title)').eq('status', 'completed').order('created_at', { ascending: false }),
        supabase.from('video_call_sessions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      ]);

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: newStudents } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').gte('created_at', firstDay);

      const totalRev = (orders || []).reduce((s, o) => s + o.amount_cents, 0);
      setStats({ courses: courses || 0, students: students || 0, orders: orders?.length || 0, revenue: totalRev / 100, newStudentsMonth: newStudents || 0, activeCalls: activeCalls || 0 });
      setRecentOrders((orders || []).slice(0, 5));

      // Revenue chart (last 30 days)
      const map = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        map[d.toISOString().split('T')[0]] = 0;
      }
      const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
      (orders || []).filter(o => new Date(o.created_at) >= thirtyAgo).forEach(o => {
        const k = new Date(o.created_at).toISOString().split('T')[0];
        if (map[k] !== undefined) map[k] += o.amount_cents / 100;
      });
      setRevenueData(Object.entries(map).map(([date, revenue]) => ({ date: date.slice(5), revenue: Math.round(revenue * 100) / 100 })));

      // Top courses
      const cRev = {};
      (orders || []).forEach(o => { const n = o.courses?.title || '?'; cRev[n] = (cRev[n] || 0) + o.amount_cents / 100; });
      setTopCourses(Object.entries(cRev).map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 })).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
      setLoading(false);
    }
    fetch();
  }, []);

  const statCards = [
    { label: 'Total Courses', value: stats.courses, icon: '📚', accent: 'linear-gradient(135deg,#c84070,#f07090)', subtext: <Link to="/admin/courses" style={{ color: A.rose, fontSize: 11, textDecoration: 'none' }}>Manage →</Link> },
    { label: 'Total Students', value: stats.students, icon: '👩‍🎓', accent: 'linear-gradient(135deg,#e87090,#f0a0b8)', subtext: `+${stats.newStudentsMonth} this month` },
    { label: 'Total Revenue', value: `$${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`, icon: '💰', accent: 'linear-gradient(135deg,#d4a030,#f0c840)', subtext: `${stats.orders} completed orders` },
    { label: 'Active Calls', value: stats.activeCalls, icon: '📞', accent: 'linear-gradient(135deg,#2ecc71,#48e88a)', subtext: <Link to="/admin/calls" style={{ color: A.green, fontSize: 11, textDecoration: 'none' }}>View all →</Link> },
  ];

  const tooltipStyle = { background: 'white', border: `1px solid ${A.cardBorder}`, borderRadius: 8, fontSize: 12, fontFamily: A.fontBody };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <motion.div {...stagger(0)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: A.fontDisplay, fontSize: 'clamp(24px,3.5vw,34px)', fontWeight: 600, color: A.textPrimary, margin: 0 }}>Dashboard</h1>
            <p style={{ fontFamily: A.fontBody, fontSize: 13, color: A.textMuted, margin: '4px 0 0' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="ghost" size="sm" onClick={() => exportCSV(recentOrders.map(o => ({ student: o.profiles?.full_name, course: o.courses?.title, amount: o.amount_cents / 100, date: o.created_at })), 'recent_orders.csv')}>
              ↓ Export
            </Btn>
            <Link to="/admin/courses/new">
              <Btn variant="primary" size="sm">+ New Course</Btn>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
          {statCards.map((s, i) => (
            <motion.div key={i} {...stagger(i)}>
              <StatCard {...s} loading={loading} />
            </motion.div>
          ))}
        </div>

        {/* Revenue chart */}
        <motion.div {...stagger(4)}>
          <Card style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: A.fontDisplay, fontSize: 20, fontWeight: 600, color: A.textPrimary, margin: '0 0 20px' }}>Revenue — Last 30 Days</h3>
            {loading ? <Skeleton height={280} /> : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={A.cardBorder} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: A.fontBody }} stroke={A.cardBorder} />
                  <YAxis tick={{ fontSize: 11, fontFamily: A.fontBody }} stroke={A.cardBorder} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke={A.rose} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: A.rose }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        {/* Top courses + Recent orders */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
          <motion.div {...stagger(5)}>
            <Card style={{ padding: '24px' }}>
              <h3 style={{ fontFamily: A.fontDisplay, fontSize: 20, fontWeight: 600, color: A.textPrimary, margin: '0 0 20px' }}>Top Courses by Revenue</h3>
              {loading ? <Skeleton height={240} /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topCourses} layout="vertical" margin={{ left: 0, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={A.cardBorder} />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke={A.cardBorder} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontFamily: A.fontBody }} width={110} stroke={A.cardBorder} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill={A.rose} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </motion.div>

          <motion.div {...stagger(6)}>
            <Card style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontFamily: A.fontDisplay, fontSize: 20, fontWeight: 600, color: A.textPrimary, margin: 0 }}>Recent Orders</h3>
                <Link to="/admin/orders" style={{ fontFamily: A.fontBody, fontSize: 12, color: A.rose, textDecoration: 'none' }}>View all →</Link>
              </div>
              {loading ? <Skeleton height={240} /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {recentOrders.length === 0 ? (
                    <p style={{ fontFamily: A.fontBody, fontSize: 13, color: A.textMuted }}>No orders yet.</p>
                  ) : recentOrders.map((o, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < recentOrders.length - 1 ? `1px solid ${A.cardBorder}` : 'none' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: A.roseBg, border: `1px solid ${A.roseBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>💰</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: A.fontBody, fontSize: 13, fontWeight: 500, color: A.textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.courses?.title || '—'}</p>
                        <p style={{ fontFamily: A.fontBody, fontSize: 11, color: A.textMuted, margin: '1px 0 0' }}>{o.profiles?.full_name} · {new Date(o.created_at).toLocaleDateString()}</p>
                      </div>
                      <span style={{ fontFamily: A.fontBody, fontSize: 14, fontWeight: 700, color: A.rose, flexShrink: 0 }}>${(o.amount_cents / 100).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}