import { useState, useEffect, useRef } from 'react';
import { useChat } from './useChat';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function ChatDrawer({ userId, onClose }) {
  const { messages, loading, sendMessage } = useChat(userId);
  const [newMsg, setNewMsg] = useState('');
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (newMsg.trim()) {
      sendMessage(newMsg.trim());
      setNewMsg('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-brand-rose-200/40 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Support Chat</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <p className="text-center text-gray-400 text-sm">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-400 text-sm">Send a message to start the conversation.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                msg.sender_id === userId
                  ? 'bg-brand-rose-500 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-brand-rose-200/40 flex gap-2">
        <input
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-brand-rose-200/40 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose-400"
        />
        <button type="submit" className="btn-primary text-xs px-4 py-2">
          Send
        </button>
      </form>
    </div>
  );
}