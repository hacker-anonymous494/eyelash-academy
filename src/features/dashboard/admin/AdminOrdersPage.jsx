import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';
import AdminLayout from './AdminLayout';
import GlassCard from '@/shared/components/GlassCard';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      const { data } = await supabase
        .from('orders')
        .select('*, profiles(full_name), courses(title)')
        .order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    }
    fetchOrders();
  }, []);

  return (
    <AdminLayout>
      <h2 className="text-3xl font-display font-semibold mb-6">Orders</h2>
      {loading ? (
        <div className="animate-spin h-10 w-10 border-4 border-brand-rose-200 border-t-brand-rose-600 rounded-full" />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <GlassCard key={order.id} className="flex justify-between items-center p-4">
              <div>
                <p className="font-medium">{order.courses?.title}</p>
                <p className="text-sm text-gray-500">
                  {order.profiles?.full_name} – {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${(order.amount_cents / 100).toFixed(2)}</p>
                <p className={`text-xs ${order.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {order.status}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}