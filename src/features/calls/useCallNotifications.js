import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { sendNotification } from '@/lib/notifications';

export function useCallNotifications() {
  const { user } = useAuth();
  const channelRef = useRef(null);

  const subscribeToCalls = useCallback(() => {
    if (!user) return;

    // Listen to changes on video_call_sessions where the student is involved
    const channel = supabase
      .channel(`student_calls_${user.id}`)
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

          // If room became ready and the student hasn't joined yet
          if (session.room_ready && !session.joined_by?.includes(user.id)) {
            // Show browser notification
            sendNotification('Your call is starting!', {
              body: 'The instructor is waiting. Click to join.',
            });

            // Dispatch custom event for in-app notification
            window.dispatchEvent(
              new CustomEvent('call:invite', {
                detail: { sessionId: session.id },
              })
            );
          }

          // If call ended, dispatch event
          if (session.status === 'ended') {
            window.dispatchEvent(
              new CustomEvent('call:ended', {
                detail: { sessionId: session.id },
              })
            );
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    subscribeToCalls();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [subscribeToCalls]);
}