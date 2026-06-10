import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';
import AdminLayout from './AdminLayout';
import GlassCard from '@/shared/components/GlassCard';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';

// ─── Helpers ──────────────────────────────────────────────────────────────
const COLORS = ['#c84070', '#f0a0b8', '#e87090', '#d4a030', '#3498db', '#2ecc71'];

function exportCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState([]);
  const [enrollmentData, setEnrollmentData] = useState([]);
  const [coursePopularity, setCoursePopularity] = useState([]);
  const [completionRates, setCompletionRates] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [period, setPeriod] = useState('daily'); // daily | weekly | monthly

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      // 1. Orders with course title
      const { data: orders } = await supabase
        .from('orders')
        .select('*, courses(title), profiles(full_name)')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      
      const allOrders = orders || [];
      setRecentOrders(allOrders.slice(0, 10));

      // 2. Revenue over time
      const revenueMap = new Map();
      allOrders.forEach(order => {
        const date = new Date(order.created_at);
        let key;
        if (period === 'daily') {
          key = date.toISOString().slice(0, 10); // YYYY-MM-DD
        } else if (period === 'weekly') {
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          key = startOfWeek.toISOString().slice(0, 10);
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}`;
        }
        const current = revenueMap.get(key) || 0;
        revenueMap.set(key, current + (order.amount_cents / 100));
      });
      const revenueArr = Array.from(revenueMap, ([date, amount]) => ({ date, revenue: Math.round(amount * 100) / 100 }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setRevenueData(revenueArr);

      // 3. Enrollment trends (enrollments over time)
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*, courses(title)')
        .order('purchased_at', { ascending: false });
      const enrollMap = new Map();
      (enrollments || []).forEach(enr => {
        const date = new Date(enr.purchased_at);
        let key;
        if (period === 'daily') key = date.toISOString().slice(0, 10);
        else if (period === 'weekly') {
          const sow = new Date(date);
          sow.setDate(date.getDate() - date.getDay());
          key = sow.toISOString().slice(0, 10);
        } else key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}`;
        const current = enrollMap.get(key) || 0;
        enrollMap.set(key, current + 1);
      });
      const enrollArr = Array.from(enrollMap, ([date, count]) => ({ date, students: count }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setEnrollmentData(enrollArr);

      // 4. Course popularity (by revenue)
      const courseMap = new Map();
      allOrders.forEach(order => {
        const name = order.courses?.title || 'Unknown';
        const current = courseMap.get(name) || 0;
        courseMap.set(name, current + (order.amount_cents / 100));
      });
      const popArr = Array.from(courseMap, ([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
      setCoursePopularity(popArr);

      // 5. Completion rates (certificates issued vs total students per course)
      const { data: courses } = await supabase.from('courses').select('id, title');
      const { data: certs } = await supabase.from('certificates').select('course_id');
      const { data: allEnrollments } = await supabase.from('enrollments').select('course_id');
      const completion = (courses || []).map(course => {
        const totalEnrolled = (allEnrollments || []).filter(e => e.course_id === course.id).length;
        const totalCerts = (certs || []).filter(c => c.course_id === course.id).length;
        return {
          name: course.title,
          enrolled: totalEnrolled,
          certified: totalCerts,
          rate: totalEnrolled > 0 ? Math.round((totalCerts / totalEnrolled) * 100) : 0,
        };
      });
      setCompletionRates(completion);

      setLoading(false);
    }
    fetchAll();
  }, [period]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-display font-semibold">Advanced Analytics</h2>
          <div className="flex gap-2">
            {['daily', 'weekly', 'monthly'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  period === p
                    ? 'bg-brand-rose-600 text-white shadow'
                    : 'bg-white/60 text-gray-500 border border-brand-rose-200/40 hover:bg-brand-rose-50'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-rose-200 border-t-brand-rose-600" />
          </div>
        ) : (
          <>
            {/* Revenue Trend */}
            <GlassCard className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-semibold text-xl">Revenue Trend</h3>
                <button onClick={() => exportCSV(revenueData, `revenue_${period}.csv`)}
                  className="text-xs text-brand-rose-600 hover:underline">Export CSV</button>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e0e0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#c84070" strokeWidth={2} dot={false} name="Revenue ($)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Enrollment Trend */}
            <GlassCard className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-semibold text-xl">Student Enrollment Trend</h3>
                <button onClick={() => exportCSV(enrollmentData, `enrollments_${period}.csv`)}
                  className="text-xs text-brand-rose-600 hover:underline">Export CSV</button>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={enrollmentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e0e0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="students" fill="#e87090" radius={[4, 4, 0, 0]} name="New Enrollments" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Course Popularity */}
              <GlassCard className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-semibold text-xl">Course Revenue Share</h3>
                  <button onClick={() => exportCSV(coursePopularity, 'course_popularity.csv')}
                    className="text-xs text-brand-rose-600 hover:underline">Export CSV</button>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={coursePopularity}
                        cx="50%" cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {coursePopularity.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => `$${val}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              {/* Completion Rates */}
              <GlassCard className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-semibold text-xl">Completion Rates</h3>
                  <button onClick={() => exportCSV(completionRates, 'completion_rates.csv')}
                    className="text-xs text-brand-rose-600 hover:underline">Export CSV</button>
                </div>
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {completionRates.map((c) => (
                    <div key={c.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="truncate mr-2">{c.name}</span>
                        <span className="text-gray-500">{c.certified}/{c.enrolled} ({c.rate}%)</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-rose-500 to-brand-rose-300 rounded-full"
                          style={{ width: `${c.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            {/* Recent Orders Table */}
            <GlassCard className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-semibold text-xl">Recent Orders</h3>
                <button onClick={() => exportCSV(recentOrders, 'recent_orders.csv')}
                  className="text-xs text-brand-rose-600 hover:underline">Export CSV</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-brand-rose-100">
                      <th className="pb-2">Student</th>
                      <th className="pb-2">Course</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(order => (
                      <tr key={order.id} className="border-b border-brand-rose-50">
                        <td className="py-2">{order.profiles?.full_name || '—'}</td>
                        <td className="py-2">{order.courses?.title || '—'}</td>
                        <td className="py-2 font-semibold">${(order.amount_cents / 100).toFixed(2)}</td>
                        <td className="py-2 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </>
        )}
      </div>
    </AdminLayout>
  );
}