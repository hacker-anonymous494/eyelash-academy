import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import AdminLayout from './AdminLayout';
import GlassCard from '@/shared/components/GlassCard';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ courses: 0, students: 0, orders: 0, revenue: 0, newStudentsMonth: 0 });
  const [revenueData, setRevenueData] = useState([]);
  const [topCourses, setTopCourses] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    async function fetchAnalytics() {
      // Basic counts
      const [{ count: courses }, { count: students }, { data: orders }] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('orders').select('amount_cents, created_at, student_id, course_id, profiles(full_name), courses(title)').eq('status', 'completed').order('created_at', { ascending: false }),
      ]);

      const totalRevenue = orders?.reduce((sum, o) => sum + o.amount_cents, 0) || 0;
      const newStudentsMonth = await getNewStudentsThisMonth();

      setStats({
        courses: courses || 0,
        students: students || 0,
        orders: orders?.length || 0,
        revenue: totalRevenue / 100,
        newStudentsMonth,
      });

      // Revenue over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentOrders = orders?.filter(o => new Date(o.created_at) >= thirtyDaysAgo) || [];

      const dailyMap = {};
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        dailyMap[key] = 0;
      }

      recentOrders.forEach(order => {
        const dateKey = new Date(order.created_at).toISOString().split('T')[0];
        if (dailyMap[dateKey] !== undefined) {
          dailyMap[dateKey] += order.amount_cents / 100;
        }
      });

      const chartData = Object.entries(dailyMap)
        .map(([date, amount]) => ({ date: date.slice(5), revenue: amount }))
        .reverse();

      setRevenueData(chartData);

      // Top courses by revenue
      const courseRevenue = {};
      orders?.forEach(order => {
        const courseName = order.courses?.title || 'Unknown';
        courseRevenue[courseName] = (courseRevenue[courseName] || 0) + order.amount_cents / 100;
      });
      const topCoursesArr = Object.entries(courseRevenue)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopCourses(topCoursesArr);

      // Recent orders (last 5)
      setRecentOrders((orders || []).slice(0, 5));

      setLoading(false);
    }
    fetchAnalytics();
  }, []);

  async function getNewStudentsThisMonth() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')
      .gte('created_at', firstDay);
    return count || 0;
  }

  const statCards = [
    { label: 'Total Courses', value: stats.courses, to: '/admin/courses', icon: '📚', color: '#c84070' },
    { label: 'Students', value: stats.students, to: '/admin/students', icon: '👩‍🎓', sub: `+${stats.newStudentsMonth} this month`, color: '#e87090' },
    { label: 'Orders', value: stats.orders, to: '/admin/orders', icon: '💰', color: '#c09010' },
    { label: 'Revenue', value: `$${stats.revenue.toFixed(0)}`, icon: '💵', color: '#4caf50' },
  ];

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <h2 className="text-3xl font-display font-semibold mb-8">Analytics Overview</h2>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-rose-200 border-t-brand-rose-600" />
          </div>
        ) : (
          <>
            {/* Stat cards – fixed missing key warning by using card.label as key */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((card) => (
                <motion.div
                  key={card.label}    // ✅ unique key
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: statCards.indexOf(card) * 0.1 }}
                >
                  <GlassCard className="p-6 relative overflow-hidden">
                    <div className="text-3xl mb-2">{card.icon}</div>
                    <div className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</div>
                    <div className="text-sm text-gray-500">
                      {card.to ? <Link to={card.to} className="hover:text-brand-rose-600">{card.label}</Link> : card.label}
                    </div>
                    {card.sub && <div className="text-xs text-green-600 mt-1">{card.sub}</div>}
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {/* Revenue chart – fixed dimensions wrapper */}
            <GlassCard className="p-6 mb-8">
              <h3 className="font-display font-semibold text-xl mb-4">Revenue (Last 30 Days)</h3>
              <div className="w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e0e0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#c84070" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Top courses – fixed dimensions wrapper */}
              <GlassCard className="p-6">
                <h3 className="font-display font-semibold text-xl mb-4">Top Courses by Revenue</h3>
                <div className="w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topCourses} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0e0e0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#e87090" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              {/* Recent orders – fixed missing key warning */}
              <GlassCard className="p-6">
                <h3 className="font-display font-semibold text-xl mb-4">Recent Orders</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex justify-between items-center text-sm">   {/* ✅ unique key */}
                      <div>
                        <p className="font-medium">{order.courses?.title || 'Course'}</p>
                        <p className="text-gray-500 text-xs">
                          {order.profiles?.full_name} – {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-semibold text-brand-rose-600">${(order.amount_cents / 100).toFixed(2)}</p>
                    </div>
                  ))}
                  {recentOrders.length === 0 && <p className="text-gray-400 text-sm">No orders yet.</p>}
                </div>
              </GlassCard>
            </div>
          </>
        )}
      </motion.div>
    </AdminLayout>
  );
}