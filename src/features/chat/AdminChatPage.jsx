import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/config/supabase';
import AdminLayout from '../dashboard/admin/AdminLayout';
import { A, Spinner, Btn } from "../dashboard/admin/adminShared.jsx";
import { requestNotificationPermission, sendNotification } from '@/lib/notifications';

function SendIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>;
}

export default function AdminChatPage() {
  const [rooms, setRooms] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [studentNames, setStudentNames] = useState({});
  const [studentAvatars, setStudentAvatars] = useState({});
  const [newMsg, setNewMsg] = useState('');
  const [unread, setUnread] = useState({});
  const [adminId, setAdminId] = useState(null);
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    requestNotificationPermission();
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setAdminId(user.id); });
  }, []);

  // Fetch all rooms
  useEffect(() => {
    const load = async () => {
      const { data: roomsData } = await supabase.from('chat_rooms').select('*').eq('room_type', 'support').order('created_at', { ascending: false });
      if (!roomsData) return;
      const sIds = [...new Set(roomsData.map(r => r.participants?.[0]).filter(Boolean))];
      if (sIds.length) {
        const { data: profiles } = await supabase.from('profiles').select('id,full_name,avatar_url').in('id', sIds);
        const names = {}; const avatars = {};
        (profiles || []).forEach(p => { names[p.id] = p.full_name || 'Student'; avatars[p.id] = p.avatar_url; });
        setStudentNames(names); setStudentAvatars(avatars);
      }
      // Last message preview per room
      const enriched = await Promise.all(roomsData.map(async room => {
        const { data: last } = await supabase.from('chat_messages').select('content,created_at,sender_id').eq('room_id', room.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
        const { count } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('room_id', room.id).neq('sender_id', adminId || '');
        return { ...room, lastMsg: last, unreadCount: count || 0 };
      }));
      setRooms(enriched);
      const u = {}; enriched.forEach(r => { u[r.id] = r.unreadCount; });
      setUnread(u);
    };
    load();
  }, [adminId]);

  // Load messages for selected room
  useEffect(() => {
    if (!selected) return;
    setLoadingMsgs(true);
    supabase.from('chat_messages').select('*').eq('room_id', selected.id).order('created_at', { ascending: true })
      .then(({ data }) => { setMessages(data || []); setLoadingMsgs(false); setUnread(p => ({ ...p, [selected.id]: 0 })); });

    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase.channel(`admin_chat_${selected.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${selected.id}` }, payload => {
        setMessages(p => [...p, payload.new]);
        const studentId = selected.participants?.[0];
        if (payload.new.sender_id === studentId) {
          if (document.hidden) {
            sendNotification(`💬 ${studentNames[studentId] || 'Student'} sent a message`, { body: payload.new.content?.slice(0, 100) });
            setUnread(p => ({ ...p, [selected.id]: (p[selected.id] || 0) + 1 }));
          }
        }
      }).subscribe();
    channelRef.current = ch;
    return () => supabase.removeChannel(ch);
  }, [selected?.id, studentNames]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !selected || !adminId) return;
    setSending(true);
    await supabase.from('chat_messages').insert({ room_id: selected.id, sender_id: adminId, content: newMsg.trim() });
    setNewMsg(''); setSending(false);
    inputRef.current?.focus();
  };

  const totalUnread = Object.values(unread).reduce((s, v) => s + v, 0);

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: A.fontDisplay, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 600, color: A.textPrimary, margin: 0 }}>
              Support Chat
              {totalUnread > 0 && <span style={{ fontFamily: A.fontBody, fontSize: 13, fontWeight: 700, background: A.roseGrad, color: 'white', borderRadius: 100, padding: '2px 10px', marginLeft: 10, verticalAlign: 'middle' }}>{totalUnread}</span>}
            </h1>
            <p style={{ fontFamily: A.fontBody, fontSize: 13, color: A.textMuted, margin: '4px 0 0' }}>{rooms.length} active conversations</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 220px)', minHeight: 480 }} className="chat-layout">
          {/* Room list */}
          <div style={{ width: 280, flexShrink: 0, background: 'rgba(255,255,255,0.97)', border: `1px solid ${A.cardBorder}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${A.cardBorder}`, background: A.roseBg }}>
              <h3 style={{ fontFamily: A.fontBody, fontSize: 13, fontWeight: 700, color: A.textSecondary, margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Conversations</h3>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {rooms.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
                  <p style={{ fontFamily: A.fontBody, fontSize: 13, color: A.textMuted }}>No conversations yet</p>
                </div>
              ) : rooms.map(room => {
                const sId = room.participants?.[0];
                const name = studentNames[sId] || 'Student';
                const isSelected = selected?.id === room.id;
                const u = unread[room.id] || 0;
                return (
                  <button key={room.id} onClick={() => setSelected(room)} style={{
                    width: '100%', textAlign: 'left', padding: '12px 14px',
                    borderBottom: `1px solid ${A.cardBorder}`, cursor: 'pointer',
                    background: isSelected ? A.roseBg : 'transparent',
                    borderLeft: isSelected ? `3px solid ${A.rose}` : '3px solid transparent',
                    display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s', border: 'none',
                  }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(200,64,112,0.04)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#c84070,#f07090)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: A.fontBody, fontSize: 14, fontWeight: 700, color: 'white' }}>
                      {name[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: A.fontBody, fontSize: 13, fontWeight: u > 0 ? 700 : 500, color: A.textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                      <p style={{ fontFamily: A.fontBody, fontSize: 11, color: A.textMuted, margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.lastMsg?.content || 'No messages'}</p>
                    </div>
                    {u > 0 && <span style={{ background: A.rose, color: 'white', fontFamily: A.fontBody, fontSize: 10, fontWeight: 700, borderRadius: 100, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>{u}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message panel */}
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.97)', border: `1px solid ${A.cardBorder}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {!selected ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: A.roseBg, border: `1px solid ${A.roseBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>💬</div>
                <h3 style={{ fontFamily: A.fontDisplay, fontSize: 20, color: A.textPrimary, margin: 0 }}>Select a conversation</h3>
                <p style={{ fontFamily: A.fontBody, fontSize: 13, color: A.textMuted }}>Choose a student from the list to start chatting</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${A.cardBorder}`, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(200,64,112,0.02)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#c84070,#f07090)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: A.fontBody, fontSize: 14, fontWeight: 700, color: 'white' }}>
                    {(studentNames[selected.participants?.[0]] || 'S')[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ fontFamily: A.fontBody, fontSize: 14, fontWeight: 600, color: A.textPrimary, margin: 0 }}>{studentNames[selected.participants?.[0]] || 'Student'}</h4>
                    <p style={{ fontFamily: A.fontBody, fontSize: 11, color: A.textMuted, margin: 0 }}>Student</p>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {loadingMsgs ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size={32} /></div>
                  ) : messages.map((msg, i) => {
                    const isStudent = msg.sender_id === selected.participants?.[0];
                    const showDate = i === 0 || new Date(messages[i - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString();
                    return (
                      <div key={msg.id}>
                        {showDate && <div style={{ textAlign: 'center', margin: '8px 0' }}><span style={{ fontFamily: A.fontBody, fontSize: 11, color: A.textMuted, background: 'rgba(200,64,112,0.06)', borderRadius: 100, padding: '3px 10px' }}>{new Date(msg.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>}
                        <div style={{ display: 'flex', justifyContent: isStudent ? 'flex-start' : 'flex-end' }}>
                          <div style={{
                            maxWidth: '72%', padding: '9px 13px', borderRadius: isStudent ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                            background: isStudent ? '#f5f5f5' : A.roseGrad,
                            color: isStudent ? A.textPrimary : 'white',
                            fontFamily: A.fontBody, fontSize: 13.5, lineHeight: 1.45,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                          }}>
                            {msg.content}
                            <div style={{ fontSize: 10, opacity: 0.55, marginTop: 3, textAlign: 'right' }}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} style={{ padding: '12px 16px', borderTop: `1px solid ${A.cardBorder}`, display: 'flex', gap: 10, alignItems: 'flex-end', background: 'rgba(200,64,112,0.02)' }}>
                  <textarea
                    ref={inputRef}
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
                    placeholder="Type a reply… (Enter to send)"
                    rows={1}
                    style={{
                      flex: 1, fontFamily: A.fontBody, fontSize: 13.5, color: A.textPrimary,
                      background: 'white', border: `1px solid ${A.cardBorder}`, borderRadius: 12,
                      padding: '10px 14px', outline: 'none', resize: 'none', lineHeight: 1.45,
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(200,64,112,0.4)'}
                    onBlur={e => e.target.style.borderColor = A.cardBorder}
                  />
                  <button type="submit" disabled={!newMsg.trim() || sending} style={{
                    width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
                    background: !newMsg.trim() || sending ? 'rgba(200,64,112,0.2)' : A.roseGrad,
                    color: 'white', cursor: !newMsg.trim() || sending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: newMsg.trim() && !sending ? '0 2px 10px rgba(200,64,112,0.35)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    <SendIcon />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .chat-layout { flex-direction: column !important; height: auto !important; }
          .chat-layout > div:first-child { width: 100% !important; max-height: 200px; }
          .chat-layout > div:last-child { min-height: 400px; }
        }
      `}</style>
    </AdminLayout>
  );
}