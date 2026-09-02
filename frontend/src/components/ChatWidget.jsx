// frontend/src/components/ChatWidget.jsx
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Minus, Send, ShieldAlert } from 'lucide-react';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const WELCOME_MESSAGE = `Hello! 👋 I'm the MedSync Clinic Virtual Assistant.

I can help you with booking appointments, choosing the right doctor based on your symptoms, payment options (Online Gateway, Bank Transfer, or Pay at Reception), and what to expect when you arrive at the clinic.

How can I help you today?`;

const QUICK_PROMPTS = [
  'How do I book an appointment?',
  'Which doctor should I see for a headache?',
  'What payment methods do you accept?',
  'What should I bring to my appointment?',
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'bot', text: WELCOME_MESSAGE },
  ]);
  const listRef = useRef(null);

  // Auto-scroll to the latest message whenever the list (or typing state) changes.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading, isOpen]);

  const sendMessage = async (raw) => {
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (!trimmed || isLoading) return;

    // Snapshot the current conversation to send as context. The backend slices
    // it down to the last few turns to bound latency and token spend.
    const conversationHistory = messages
      .filter((m) => m && typeof m.text === 'string' && m.text.trim())
      .map((m) => ({ sender: m.sender, text: m.text }));

    setMessages((prev) => [...prev, { sender: 'user', text: trimmed }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationHistory }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success || typeof json?.data?.reply !== 'string') {
        throw new Error(json?.message || `Request failed (HTTP ${res.status})`);
      }

      setMessages((prev) => [...prev, { sender: 'bot', text: json.data.reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `I couldn't reach the assistant right now. ${
            error.message || 'Please try again in a moment.'
          }`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[560px] max-h-[calc(100vh-7rem)] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 bg-[#00a8cc] px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">
                  MedSync Assistant
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-cyan-50">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Online
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Minimize chat"
                className="rounded-lg p-1.5 transition hover:bg-white/20"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="rounded-lg p-1.5 transition hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Medical disclaimer */}
          <div className="flex items-start gap-2 border-b border-slate-100 bg-amber-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-800/60">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
            <p className="text-[11px] leading-snug text-amber-700 dark:text-amber-400">
              For general guidance only — not a substitute for professional
              medical advice. In an emergency, call your local emergency
              services immediately.
            </p>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4 scroll-smooth dark:bg-slate-950/40 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
          >
            {messages.map((msg, i) =>
              msg.sender === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-[#00a8cc] px-3.5 py-2.5 text-sm text-white shadow-sm">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700/50">
                    {msg.text}
                  </div>
                </div>
              ),
            )}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-slate-700/50">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#00a8cc] [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#00a8cc] [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#00a8cc] [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts (before the patient sends their first message) */}
          {messages.length <= 1 && !isLoading && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  disabled={isLoading}
                  className="shrink-0 rounded-full border border-[#00a8cc]/40 bg-[#00a8cc]/5 px-3 py-1.5 text-xs text-[#00a8cc] transition hover:bg-[#00a8cc]/10 disabled:opacity-60 dark:text-cyan-400"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Footer input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-slate-100 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Type your message…"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#00a8cc] focus:outline-none focus:ring-2 focus:ring-[#00a8cc]/40 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#00a8cc] text-white transition hover:bg-[#0092b3] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Close chat assistant' : 'Open chat assistant'}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#00a8cc] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/20 transition hover:bg-[#0092b3] focus:outline-none focus:ring-2 focus:ring-[#00a8cc]/50"
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
        <span className="hidden sm:inline">
          {isOpen ? 'Close' : 'Need Help?'}
        </span>
      </button>
    </>
  );
}