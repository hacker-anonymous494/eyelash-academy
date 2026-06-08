import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { motion } from 'framer-motion';
import GlassCard from '@/shared/components/GlassCard';
import GradientText from '@/shared/components/GradientText';
import PageTransition from '@/shared/components/PageTransition';
import BackgroundBlobs from '@/shared/components/BackgroundBlobs';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function CatalogPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchCourses() {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (!error) setCourses(data);
      setLoading(false);
    }
    fetchCourses();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff6f9] via-[#fdf2ee] to-[#fff0f4] relative overflow-hidden">
      <BackgroundBlobs section="mid" />
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 py-16 relative z-10">
          <div className="text-center mb-12">
            <span className="section-tag mb-4">Course Catalog</span>
            <h1 className="text-3xl md:text-5xl font-display font-semibold mb-4">
              Master the <GradientText>Art of Lashes</GradientText>
            </h1>
            <p className="text-brand-rose-600/70 max-w-2xl mx-auto">
              Choose your path from our professional curriculum, designed by world-renowned lash artists
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-rose-200 border-t-brand-rose-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course, i) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <GlassCard className="card-hover overflow-hidden flex flex-col h-full">
                    <div className="relative h-48 -m-6 mb-6 overflow-hidden rounded-t-2xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-rose-400 to-brand-rose-800 opacity-80" />
                      <div className="absolute inset-0 flex items-center justify-center text-white/90 text-5xl font-display italic">
                        {course.title.charAt(0)}
                      </div>
                      {course.preview_video_url && (
                        <div className="absolute top-4 right-4 bg-white/90 text-brand-rose-600 text-xs font-semibold px-3 py-1 rounded-full">
                          Free Preview
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">
                      {course.description || 'Comprehensive training in eyelash extension artistry'}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-2xl font-bold text-brand-rose-800">
                        ${(course.price_cents / 100).toFixed(0)}
                      </span>
                      {user ? (
                        <Link
                          to={`/courses/${course.slug}`}
                          className="btn-primary text-sm px-4 py-2"
                        >
                          View Course
                        </Link>
                      ) : (
                        <Link
                          to="/login"
                          className="btn-ghost text-sm px-4 py-2"
                        >
                          Sign In to Enroll
                        </Link>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </PageTransition>
    </div>
  );
}