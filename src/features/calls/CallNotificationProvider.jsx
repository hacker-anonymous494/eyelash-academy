import { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { sendNotification } from '@/lib/notifications';

export default function CallNotificationProvider() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

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
            // Show browser notification
            sendNotification('Your call is starting!', {
              body: 'The instructor is waiting. Click to join.',
            });

            // In-app toast (we'll dispatch a custom event)
            window.dispatchEvent(
              new CustomEvent('call:invite', {
                detail: { sessionId: session.id },
              })
            );
          }
        }
      )
      .subscribe();

    // Listen for "join" from toast
    const handler = (e) => {
      navigate(`/call/${e.detail.sessionId}`);
    };
    window.addEventListener('call:join', handler);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('call:join', handler);
    };
  }, [user, navigate]);

  return null; // This component doesn't render anything
}