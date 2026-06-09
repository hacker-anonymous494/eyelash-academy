import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSignOut } from '@/features/auth/hooks/useSignOut';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { sendNotification } from '@/lib/notifications';
import GlassCard from '@/shared/components/GlassCard';
import GradientText from '@/shared/components/GradientText';
import PageTransition from '@/shared/components/PageTransition';
import BackgroundBlobs from '@/shared/components/BackgroundBlobs';
import ChatBubble from '@/features/chat/ChatBubble';
import { useCallNotifications } from '@/features/calls/useCallNotifications';
import CallNotification from '@/features/calls/CallNotification';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { signOut } = useSignOut();
  useCallNotifications(); // optional polling fallback

  // Real‑time call notification listener
  const channelRef = useRef(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!user || subscribedRef.current) return;

    const channel = supabase
      .channel(`call_notify_${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'video_call_sessions',
        filter: `student_id=eq.${user.id}`,
      }, (payload) => {
        const session = payload.new;
        if (session.room_ready && !session.joined_by?.includes(user.id)) {
          sendNotification('Your call is starting!', {
            body: 'The instructor is waiting. Click to join.',
          });
          window.dispatchEvent(new CustomEvent('call:invite', {
            detail: { sessionId: session.id },
          }));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') subscribedRef.current = true;
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      subscribedRef.current = false;
    };
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff6f9] via-[#fdf2ee] to-[#fff0f4] relative overflow-hidden">
      <BackgroundBlobs section="mid" />
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 py-12 relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-4xl font-display font-semibold"
              >
                Welcome, <GradientText>{profile?.full_name || 'Artist'}</GradientText>
              </motion.h1>
              <p className="text-brand-rose-600/70 mt-1">Continue your lash mastery journey</p>
            </div>
            <button
              onClick={signOut}
              className="btn-ghost text-sm"
            >
              Sign Out
            </button>
          </div>

          {/* Dashboard cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link to="/dashboard/courses">
              <GlassCard className="card-hover cursor-pointer flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-xl bg-brand-rose-100 flex items-center justify-center text-2xl">
                  📚
                </div>
                <div>
                  <h3 className="font-semibold text-lg">My Courses</h3>
                  <p className="text-sm text-brand-rose-600/60">Continue learning</p>
                </div>
              </GlassCard>
            </Link>

            <Link to="/dashboard/certificates">
              <GlassCard className="card-hover flex items-center gap-4 p-6 cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-brand-rose-100 flex items-center justify-center text-2xl">
                  📜
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Certificates</h3>
                  <p className="text-sm text-brand-rose-600/60">Your achievements</p>
                </div>
              </GlassCard>
            </Link>

            <GlassCard className="card-hover flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-xl bg-brand-rose-100 flex items-center justify-center text-2xl">
                💬
              </div>
              <div>
                <h3 className="font-semibold text-lg">Support</h3>
                <p className="text-sm text-brand-rose-600/60">Chat with mentors</p>
              </div>
            </GlassCard>

            <Link to="/dashboard/book-call">
              <GlassCard className="card-hover cursor-pointer flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-xl bg-brand-rose-100 flex items-center justify-center text-2xl">
                  📞
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Book a 1‑on‑1 Call</h3>
                  <p className="text-sm text-brand-rose-600/60">Schedule a mentoring session</p>
                </div>
              </GlassCard>
            </Link>

            <Link to="/dashboard/calls">
              <GlassCard className="card-hover cursor-pointer flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-xl bg-brand-rose-100 flex items-center justify-center text-2xl">
                  📞
                </div>
                <div>
                  <h3 className="font-semibold text-lg">My Calls</h3>
                  <p className="text-sm text-brand-rose-600/60">View scheduled sessions</p>
                </div>
              </GlassCard>
            </Link>
          </div>
        </div>
      </PageTransition>

      {/* ChatBubble */}
      <ChatBubble />

      {/* Call notification overlay */}
      <CallNotification />
    </div>
  );
}