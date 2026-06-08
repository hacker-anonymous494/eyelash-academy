import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import GlassCard from '@/shared/components/GlassCard';
import AdminLayout from './AdminLayout';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
      setCourses(data || []);
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const toggleStatus = async (course) => {
    const newStatus = course.status === 'published' ? 'draft' : 'published';
    await supabase.from('courses').update({ status: newStatus }).eq('id', course.id);
    setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, status: newStatus } : c)));
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-display font-semibold">Courses</h2>
        <Link to="/admin/courses/new" className="btn-primary text-sm px-4 py-2">
          + New Course
        </Link>
      </div>
      {loading ? (
        <div className="animate-spin h-10 w-10 border-4 border-brand-rose-200 border-t-brand-rose-600 rounded-full" />
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <GlassCard key={course.id} className="flex items-center justify-between p-4">
              <div>
                <h3 className="font-semibold">{course.title}</h3>
                <p className="text-sm text-gray-500">${(course.price_cents / 100).toFixed(2)} – {course.status}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleStatus(course)} className="text-sm btn-ghost px-3 py-1">
                  {course.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <Link to={`/admin/courses/${course.id}`} className="text-sm btn-primary px-3 py-1">
                  Edit
                </Link>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}