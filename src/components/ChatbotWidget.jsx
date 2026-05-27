import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { botReply, logChat, SUGGESTED_PROMPTS } from '../lib/chatbot.js';

function nanoId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ChatbotWidget() {
  const { firebaseUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessionId] = useState(() => nanoId());
  const [messages, setMessages] = useState([
    { role: 'bot', content: "Hi! 👋 I'm the Empire Skills assistant. Ask me about courses, payments, or live sessions." }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  function send(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg = { role: 'user', content: trimmed };
    const reply = botReply(trimmed);
    const botMsg = { role: 'bot', content: reply.answer, link: reply.link };
    setMessages((m) => [...m, userMsg, botMsg]);
    setInput('');
    if (firebaseUser) {
      logChat({ userId: firebaseUser.uid, sessionId, role: 'user', content: trimmed });
      logChat({ userId: firebaseUser.uid, sessionId, role: 'bot', content: reply.answer });
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-brand-600 text-white shadow-lg grid place-items-center hover:bg-brand-700 transition"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 21l1.3-3.85A8.85 8.85 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[min(360px,calc(100vw-2.5rem))] h-[70vh] max-h-[560px] card flex flex-col overflow-hidden">
          <div className="bg-brand-600 text-white p-4 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-white/20 grid place-items-center">🤖</span>
            <div>
              <p className="font-semibold">Empire Skills Bot</p>
              <p className="text-xs text-brand-100">Online · usually replies instantly</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  m.role === 'user' ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-line">{m.content}</p>
                  {m.link && (
                    <Link
                      to={m.link.to}
                      onClick={() => setOpen(false)}
                      className="inline-block mt-2 text-xs font-semibold text-brand-700 underline"
                    >
                      {m.link.label} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {messages.length <= 1 && (
            <div className="px-4 py-2 bg-white border-t flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-xs px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t bg-white p-3 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              className="flex-1 px-3 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-10 h-10 rounded-full bg-brand-600 text-white grid place-items-center disabled:opacity-50 hover:bg-brand-700"
              aria-label="Send"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
