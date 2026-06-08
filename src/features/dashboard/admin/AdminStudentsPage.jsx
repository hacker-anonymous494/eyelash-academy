import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';
import AdminLayout from './AdminLayout';
import GlassCard from '@/shared/components/GlassCard';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudents() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });
      setStudents(data || []);
      setLoading(false);
    }
    fetchStudents();
  }, []);

  return (
    <AdminLayout>
      <h2 className="text-3xl font-display font-semibold mb-6">Students</h2>
      {loading ? (
        <div className="animate-spin h-10 w-10 border-4 border-brand-rose-200 border-t-brand-rose-600 rounded-full" />
      ) : (
        <div className="space-y-4">
          {students.map((s) => (
            <GlassCard key={s.id} className="flex justify-between items-center p-4">
              <div>
                <p className="font-medium">{s.full_name}</p>
                <p className="text-sm text-gray-500">{s.email}</p>
              </div>
              <span className="text-xs bg-brand-rose-100 text-brand-rose-800 px-2 py-1 rounded-full">
                {s.role}
              </span>
            </GlassCard>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}