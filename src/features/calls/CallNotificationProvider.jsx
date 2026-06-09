import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { sendNotification } from '@/lib/notifications';

// Module‑level flag – survives React re‑mounts
let globalChannel = null;
let globalSubscribedUserId = null;

export default function CallNotificationProvider() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // No user? Clean up and exit
    if (!user) {
      if (globalChannel) {
        supabase.removeChannel(globalChannel);
        globalChannel = null;
        globalSubscribedUserId = null;
      }
      return;
    }

    // Already subscribed for this user? Skip
    if (globalSubscribedUserId === user.id) return;

    // Remove any stale channel
    if (globalChannel) {
      supabase.removeChannel(globalChannel);
      globalChannel = null;
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
          globalSubscribedUserId = user.id;
        }
      });

    globalChannel = channel;

    return () => {
      // Do NOT clean up on effect re‑run; only on actual logout / unmount
      // We handle cleanup in the top of this effect when user changes
    };
  }, [user?.id]);

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