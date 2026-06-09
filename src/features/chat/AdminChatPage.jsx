import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/config/supabase';
import AdminLayout from '@/features/dashboard/admin/AdminLayout';
import { requestNotificationPermission, sendNotification } from '@/lib/notifications';

export default function AdminChatPage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [studentNames, setStudentNames] = useState({});
  const [newMsg, setNewMsg] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [adminId, setAdminId] = useState(null);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);

  // Request notification permission when page loads
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Get admin user ID
  useEffect(() => {
    const getAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setAdminId(user.id);
    };
    getAdmin();
  }, []);

  // Fetch all support rooms with student profiles and message counts
  useEffect(() => {
    const fetchRooms = async () => {
      // Get all support rooms
      const { data: roomsData } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('room_type', 'support')
        .order('created_at', { ascending: false });

      if (!roomsData) return;

      // Get unique student IDs
      const studentIds = [...new Set(roomsData.map(r => r.participants[0]))];

      // Fetch student names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);
      const names = {};
      (profiles || []).forEach(p => { names[p.id] = p.full_name || 'Student'; });
      setStudentNames(names);

      // Count student messages per room (unread = student messages not seen by admin)
      const counts = {};
      for (const room of roomsData) {
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('id, sender_id')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false });
        const studentMsgs = (msgs || []).filter(m => m.sender_id === room.participants[0]);
        counts[room.id] = studentMsgs.length;
      }
      setUnreadCounts(counts);

      // Attach last message preview
      const roomsWithPreview = await Promise.all(roomsData.map(async (room) => {
        const { data: lastMsg } = await supabase
          .from('chat_messages')
          .select('content, sender_id')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return { ...room, lastMsg };
      }));

      setRooms(roomsWithPreview);
    };
    fetchRooms();
  }, []);

  // Load messages when a room is selected
  useEffect(() => {
    if (!selectedRoom) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', selectedRoom.id)
        .order('created_at', { ascending: true });
      setMessages(data || []);

      // Reset unread count for this room
      setUnreadCounts(prev => ({ ...prev, [selectedRoom.id]: 0 }));
    };
    loadMessages();

    // Subscribe to new messages in realtime
    const channel = supabase
      .channel(`admin_chat_${selectedRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${selectedRoom.id}`,
        },
        (payload) => {
          const newMsg = payload.new;
          setMessages(prev => [...prev, newMsg]);

          // If the message is from the student (not admin), increment unread count
          if (newMsg.sender_id === selectedRoom.participants[0]) {
            setUnreadCounts(prev => ({
              ...prev,
              [selectedRoom.id]: (prev[selectedRoom.id] || 0) + 1,
            }));

            // ✅ Send browser notification if:
            // - The admin is NOT currently viewing this room OR the tab is hidden
            const isAdminViewingThisRoom = selectedRoom?.id === newMsg.room_id && !document.hidden;
            if (!isAdminViewingThisRoom) {
              const studentName = studentNames[selectedRoom.participants[0]] || 'A student';
              sendNotification(`✉️ New message from ${studentName}`, {
                body: newMsg.content?.length > 120 ? newMsg.content.slice(0, 120) + '…' : newMsg.content,
                icon: '/favicon.ico',
              });
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoom, studentNames]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedRoom) return;
    await supabase.from('chat_messages').insert({
      room_id: selectedRoom.id,
      sender_id: adminId,
      content: newMsg.trim(),
    });
    setNewMsg('');
  };

  const getStudentId = (room) => room.participants[0];

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-120px)] gap-4">
        {/* Rooms list */}
        <div className="w-80 bg-white/80 backdrop-blur-xl rounded-2xl border border-brand-rose-200/40 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-brand-rose-200/40">
            <h3 className="font-display font-semibold text-lg">Support Chats</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rooms.length === 0 ? (
              <p className="p-4 text-gray-400 text-sm">No conversations yet.</p>
            ) : (
              rooms.map((room) => {
                const studentId = getStudentId(room);
                const studentName = studentNames[studentId] || 'Student';
                const unread = unreadCounts[room.id] || 0;
                const isSelected = selectedRoom?.id === room.id;

                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`w-full text-left p-4 border-b border-brand-rose-100/50 transition flex items-center gap-3 ${
                      isSelected ? 'bg-brand-rose-50 border-l-4 border-l-brand-rose-500' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-brand-rose-100 flex items-center justify-center text-brand-rose-600 font-semibold text-sm">
                      {studentName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{studentName}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {room.lastMsg?.content || 'No messages'}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="bg-brand-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-auto">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Messages panel */}
        <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-2xl border border-brand-rose-200/40 overflow-hidden flex flex-col">
          {!selectedRoom ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a conversation to start chatting
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-brand-rose-200/40 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-rose-100 flex items-center justify-center text-brand-rose-600 font-semibold text-sm">
                  {(studentNames[getStudentId(selectedRoom)] || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{studentNames[getStudentId(selectedRoom)] || 'Student'}</h4>
                  <p className="text-xs text-gray-400">Student</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((msg) => {
                  const isStudent = msg.sender_id === getStudentId(selectedRoom);
                  return (
                    <div key={msg.id} className={`flex ${isStudent ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${
                          isStudent
                            ? 'bg-gray-100 text-gray-800 rounded-bl-sm'
                            : 'bg-brand-rose-500 text-white rounded-br-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={sendMessage} className="p-4 border-t border-brand-rose-200/40 flex gap-2">
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Type a reply..."
                  className="flex-1 px-3 py-2 border border-brand-rose-200/40 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose-400"
                />
                <button type="submit" className="btn-primary text-xs px-4 py-2">Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}