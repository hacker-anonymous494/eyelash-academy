import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { sendNotification } from '@/lib/notifications';

export default function CallNotificationProvider() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const channelRef = useRef(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!user || subscribedRef.current) return;

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
          subscribedRef.current = true;
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      subscribedRef.current = false;
    };
  }, [user]);

  // Listen for join events from the toast
  useEffect(() => {
    const handler = (e) => {
      navigate(`/call/${e.detail.sessionId}`);
    };
    window.addEventListener('call:join', handler);
    return () => window.removeEventListener('call:join', handler);
  }, [navigate]);

  return null;
}