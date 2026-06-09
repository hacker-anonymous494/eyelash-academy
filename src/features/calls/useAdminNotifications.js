import { useEffect, useRef } from 'react';
import { supabase } from '@/config/supabase';
import { sendNotification } from '@/lib/notifications';

export function useAdminNotifications() {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (subscribedRef.current) return;

    const channel = supabase
      .channel('admin_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'video_call_sessions' }, (payload) => {
        sendNotification('New call booked!', {
          body: `A student booked a 1‑on‑1 call for ${new Date(payload.new.scheduled_at).toLocaleString()}.`,
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
        const msg = payload.new;
        const { data: room } = await supabase.from('chat_rooms').select('participants').eq('id', msg.room_id).single();
        if (room && room.participants && room.participants[0] !== msg.sender_id) {
          sendNotification('New support message', { body: msg.content });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') subscribedRef.current = true;
      });

    return () => { supabase.removeChannel(channel); };
  }, []);
}