import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { sendNotification } from '@/lib/notifications';

export default function CallNotificationProvider() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const channelRef = useRef(null);
  const subscribedUserId = useRef(null);

  useEffect(() => {
    // If no user, or the subscription is already active for this user, do nothing
    if (!user || subscribedUserId.current === user.id) return;

    // Clean up any previous channel (shouldn't exist, but just in case)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`global_calls_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_call_sessions',
          filter: `student_id=eq.${user.id}`,
        },
        (payload) => {
          const session = payload.new;
          if (session.room_ready && !session.joined_by?.includes(user.id)) {
            sendNotification('Your call is starting!', {
              body: 'The instructor is waiting. Click to join.',
            });

            window.dispatchEvent(
              new CustomEvent('call:invite', {
                detail: { sessionId: session.id },
              })
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          subscribedUserId.current = user.id;
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      subscribedUserId.current = null;
    };
  }, [user?.id]); // Only re‑run when the actual user ID changes

  // Join event listener
  useEffect(() => {
    const handler = (e) => {
      navigate(`/call/${e.detail.sessionId}`);
    };
    window.addEventListener('call:join', handler);
    return () => window.removeEventListener('call:join', handler);
  }, [navigate]);

  return null;
}