import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import GlassCard from '@/shared/components/GlassCard';
import PageTransition from '@/shared/components/PageTransition';
import BackgroundBlobs from '@/shared/components/BackgroundBlobs';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function MyCoursesPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEnrollments() {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, courses(*)')
        .eq('student_id', user.id)
        .eq('status', 'active');

      if (!error) setEnrollments(data || []);
      setLoading(false);
    }
    if (user) fetchEnrollments();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff6f9] to-[#fff0f4] relative">
      <BackgroundBlobs section="mid" />
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 py-12 relative z-10">
          <h1 className="text-3xl font-display font-semibold mb-8">My Courses</h1>
          {loading ? (
            <div className="animate-spin h-10 w-10 border-4 border-brand-rose-200 border-t-brand-rose-600 rounded-full" />
          ) : enrollments.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <p className="text-gray-500">You are not enrolled in any courses yet.</p>
              <Link to="/courses" className="btn-primary mt-4 inline-block">
                Browse Courses
              </Link>
            </GlassCard>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((enrollment) => (
                <GlassCard key={enrollment.id} className="p-6">
                  <div className="text-3xl mb-3">📚</div>
                  <h3 className="font-semibold text-lg mb-2">{enrollment.courses?.title}</h3>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-xs text-gray-400">Enrolled {new Date(enrollment.purchased_at).toLocaleDateString()}</span>
                    <Link
                      to={`/learn/${enrollment.courses?.slug}`}
                      className="btn-primary text-sm px-4 py-2"
                    >
                      Continue
                    </Link>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </PageTransition>
    </div>
  );
}