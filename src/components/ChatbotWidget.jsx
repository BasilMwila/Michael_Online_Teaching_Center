import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { botReply, logChat, SUGGESTED_PROMPTS } from '../lib/chatbot.js';
import Icon from './Icon.jsx';

function nanoId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ChatbotWidget() {
  const { firebaseUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessionId] = useState(() => nanoId());
  const [messages, setMessages] = useState([
    { role: 'bot', content: "Hi there! 👋 I'm your Empire Skills assistant. Ask me about courses, payments, or live sessions." }
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
        className={`fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full text-white shadow-glow grid place-items-center transition-all duration-300 ${
          open
            ? 'bg-ink-800 rotate-90'
            : 'bg-gradient-to-br from-brand-500 to-brand-700 hover:scale-110 hover:shadow-lift'
        }`}
      >
        <Icon name={open ? 'x' : 'chat'} size={24} strokeWidth={2.2} />
        {!open && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent-400 border-2 border-white animate-pulse" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[min(380px,calc(100vw-2.5rem))] h-[70vh] max-h-[600px] card flex flex-col overflow-hidden animate-slide-up shadow-glow">
          <div className="relative bg-gradient-to-br from-brand-600 to-brand-800 text-white p-4 overflow-hidden">
            <div className="absolute inset-0 pattern-dots opacity-30" />
            <div className="relative flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur grid place-items-center">
                  <Icon name="message-bot" size={22} strokeWidth={2} />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent-400 border-2 border-brand-700" />
              </div>
              <div>
                <p className="font-display font-semibold">Empire Skills Bot</p>
                <p className="text-xs text-brand-100 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
                  Online · replies instantly
                </p>
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-ink-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                {m.role === 'bot' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white mr-2 mt-1 flex-shrink-0">
                    <Icon name="message-bot" size={14} strokeWidth={2.2} />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-br-sm shadow-soft'
                    : 'bg-white text-ink-800 shadow-soft rounded-bl-sm border border-ink-100'
                }`}>
                  <p className="whitespace-pre-line leading-relaxed">{m.content}</p>
                  {m.link && (
                    <Link
                      to={m.link.to}
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-brand-700 hover:text-brand-800"
                    >
                      {m.link.label} <Icon name="arrow-right" size={12} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {messages.length <= 1 && (
            <div className="px-4 py-3 bg-white border-t border-ink-100 flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-xs px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-100 transition"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-ink-100 bg-white p-3 flex gap-2 items-center"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              className="flex-1 px-4 py-2.5 rounded-full bg-ink-50 border border-ink-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-sm transition"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lift transition flex-shrink-0"
              aria-label="Send"
            >
              <Icon name="send" size={16} strokeWidth={2.2} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
