import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/shared/components/GlassCard';
import GradientText from '@/shared/components/GradientText';
import PrimaryButton from '@/shared/components/PrimaryButton';
import PageTransition from '@/shared/components/PageTransition';
import BackgroundBlobs from '@/shared/components/BackgroundBlobs';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function CourseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState(null);
  const [paypalError, setPaypalError] = useState(null);

  useEffect(() => {
    async function fetchCourse() {
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!courseData) {
        setLoading(false);
        return;
      }

      setCourse(courseData);

      const { data: modulesData } = await supabase
        .from('modules')
        .select('*, lessons(*)')
        .eq('course_id', courseData.id)
        .order('position');

      setModules(modulesData || []);

      if (user) {
        const { data: enrollData } = await supabase
          .from('enrollments')
          .select('*')
          .eq('student_id', user.id)
          .eq('course_id', courseData.id)
          .eq('status', 'active')
          .maybeSingle();
        setEnrollment(enrollData || null);
      }

      setLoading(false);
    }
    fetchCourse();
  }, [slug, user]);

  const handleEnroll = async () => {
    // This will be replaced with Stripe checkout later
    alert('Enrollment will be integrated with Stripe in next step');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-rose-200 border-t-brand-rose-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-display font-semibold">Course not found</h2>
          <Link to="/courses" className="btn-primary mt-4">Back to Catalog</Link>
        </GlassCard>
      </div>
    );
  }

  const totalLessons = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff6f9] via-[#fdf2ee] to-[#fff0f4] relative overflow-hidden">
      <BackgroundBlobs section="mid" />
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 py-12 relative z-10">
          <Link to="/courses" className="text-brand-rose-600 hover:underline text-sm mb-6 inline-block">
            ← Back to Catalog
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Course info */}
            <div className="lg:col-span-2">
              <GlassCard className="mb-8">
                <div className="relative h-48 md:h-64 -m-6 mb-6 rounded-t-2xl overflow-hidden bg-gradient-to-br from-brand-rose-400 to-brand-rose-800 flex items-center justify-center">
                  <h1 className="text-4xl md:text-5xl font-display font-semibold text-white/80 italic">{course.title.charAt(0)}</h1>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-semibold mb-4">{course.title}</h1>
                <p className="text-gray-600 leading-relaxed mb-6">{course.description}</p>
                <div className="flex flex-wrap gap-4 text-sm text-brand-rose-600">
                  <span>📚 {totalLessons} lessons</span>
                  <span>🎓 Certificate</span>
                  <span>⏱ Self-paced</span>
                </div>
              </GlassCard>

              {/* Modules & Lessons */}
              <div>
                <h2 className="text-2xl font-display font-semibold mb-4">Curriculum</h2>
                <div className="space-y-4">
                  {modules.map((mod, i) => (
                    <GlassCard key={mod.id} className="overflow-hidden">
                      <button
                        onClick={() => setExpandedModule(expandedModule === i ? null : i)}
                        className="w-full flex justify-between items-center p-4 -m-4 mb-2 hover:bg-white/20 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-brand-rose-100 flex items-center justify-center text-brand-rose-600 font-semibold text-sm">
                            {i + 1}
                          </span>
                          <div className="text-left">
                            <h3 className="font-semibold">{mod.title}</h3>
                            <p className="text-xs text-gray-500">{mod.lessons?.length || 0} lessons</p>
                          </div>
                        </div>
                        <motion.span
                          animate={{ rotate: expandedModule === i ? 45 : 0 }}
                          className="text-brand-rose-600"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                        </motion.span>
                      </button>
                      <AnimatePresence>
                        {expandedModule === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 space-y-2">
                              {mod.lessons.map((lesson) => (
                                <div key={lesson.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/50 hover:bg-white/70 transition">
                                  {lesson.free_preview ? (
                                    <span className="w-6 h-6 rounded-full bg-brand-rose-100 flex items-center justify-center text-xs">🎥</span>
                                  ) : (
                                    <span className="w-6 h-6 rounded-full bg-brand-rose-100 flex items-center justify-center text-xs">🔒</span>
                                  )}
                                  <span className="flex-1 text-sm">{lesson.title}</span>
                                  {lesson.duration_seconds && (
                                    <span className="text-xs text-gray-400">{Math.floor(lesson.duration_seconds / 60)}m</span>
                                  )}
                                  {lesson.free_preview && !enrollment && (
                                    <Link to={`/preview/${lesson.id}`} className="text-xs text-brand-rose-600 hover:underline">
                                      Preview
                                    </Link>
                                  )}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </GlassCard>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Enroll Card */}
            <div>
              <GlassCard className="sticky top-24">
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold text-brand-rose-800">
                    ${(course.price_cents / 100).toFixed(0)}
                  </span>
                  <p className="text-sm text-gray-500">One-time payment</p>
                </div>
                {enrollment ? (
                  <Link to={`/learn/${course.slug}`} className="btn-primary w-full text-center">
                        Continue Learning
                    </Link>
                ) : user ? (
                  <PayPalScriptProvider options={{ "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID }}>
                    <PayPalButtons
                      createOrder={async () => {
                        const { data: { session } } = await supabase.auth.getSession();
                        const token = session?.access_token;
                        const response = await fetch('/.netlify/functions/create-paypal-order', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ courseId: course.id, userId: user.id }),
                        });
                        if (!response.ok) {
                          const err = await response.json();
                          throw new Error(err.error);
                        }
                        const { orderID } = await response.json();
                        return orderID;
                      }}
                      onApprove={async (data) => {
                        const { data: { session } } = await supabase.auth.getSession();
                        const token = session?.access_token;
                        const response = await fetch('/.netlify/functions/capture-paypal-order', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ orderID: data.orderID, courseId: course.id }),
                        });
                        if (!response.ok) {
                          const err = await response.json();
                          setPaypalError(err.error);
                          return;
                        }
                        // Success – refresh enrollment state
                        setEnrollment({ status: 'active' });
                      }}
                      onError={(err) => setPaypalError(err.message)}
                    />
                    {paypalError && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                        {paypalError}
                      </div>
                    )}
                  </PayPalScriptProvider>
                ) : (
                  <Link to="/login" className="btn-primary w-full text-center block">
                    Sign In to Enroll
                  </Link>
                )}
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">✅ Lifetime access</li>
                  <li className="flex items-center gap-2">📜 Certificate</li>
                  <li className="flex items-center gap-2">💬 1-on-1 mentorship</li>
                  <li className="flex items-center gap-2">↩️ 30-day guarantee</li>
                </ul>
              </GlassCard>
            </div>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}