import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/config/supabase';

export function useChat(userId) {
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);
  const creatingRoom = useRef(false);      // prevent concurrent creates
  const messageIds = useRef(new Set());

  useEffect(() => {
    if (!userId) return;

    async function getOrCreateRoom() {
      // First, fetch rooms where the user is a participant
      const { data: existingRooms } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('room_type', 'support')
        .overlaps('participants', [userId]);   // reliable array overlap

      const myRoom = existingRooms?.[0] || null;
      if (myRoom) {
        setRoom(myRoom);
        return;
      }

      // Prevent multiple create attempts
      if (creatingRoom.current) return;
      creatingRoom.current = true;

      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert({
          room_type: 'support',
          participants: [userId],
          created_by: userId,
        })
        .select()
        .single();

      if (!error && newRoom) {
        setRoom(newRoom);
      }
      creatingRoom.current = false;
    }

    getOrCreateRoom();
  }, [userId]);

  // Load messages when room is available
  useEffect(() => {
    if (!room) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true });
      if (data) {
        data.forEach(m => messageIds.current.add(m.id));
        setMessages(data);
      }
      setLoading(false);
    };
    loadMessages();
  }, [room]);

  // Realtime subscription
  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`chat_room_${room.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` },
        (payload) => {
          if (messageIds.current.has(payload.new.id)) return;
          messageIds.current.add(payload.new.id);
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [room]);

  const sendMessage = useCallback(async (content) => {
    if (!room || !userId || !content.trim()) return;

    // Optimistic insert
    const optimistic = {
      id: `temp-${Date.now()}`,
      room_id: room.id,
      sender_id: userId,
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: room.id,
        sender_id: userId,
        content: content.trim(),
      });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      console.error('Send error:', error);
    }
  }, [room, userId]);

  return { room, messages, loading, sendMessage };
}