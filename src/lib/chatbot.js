import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';

const KB = [
  {
    keys: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    answer: "Hi there! 👋 I'm the Empire Skills assistant. I can help with courses, pricing, enrollment, payments, and live sessions. What would you like to know?"
  },
  {
    keys: ['course', 'courses', 'catalog', 'classes offered', 'what do you teach', 'what do you offer'],
    answer: 'You can browse our full catalog on the Courses page. Each course shows the syllabus, duration, mode (self-paced or live), and price.',
    link: { label: 'Browse courses', to: '/courses' }
  },
  {
    keys: ['price', 'pricing', 'cost', 'fee', 'how much'],
    answer: 'Prices vary by course. Visit any course detail page to see the exact fee. We accept manual bank transfer; once you upload proof of payment an admin confirms within 1 business day.'
  },
  {
    keys: ['enroll', 'enrol', 'sign up for course', 'join course', 'how do i join', 'how do i enroll', 'apply'],
    answer: '1. Create a free account · 2. Open the course detail page and click Apply · 3. You will see our bank details — pay the fee and upload proof · 4. Once confirmed, the course unlocks in your dashboard.',
    link: { label: 'Create account', to: '/signup' }
  },
  {
    keys: ['payment', 'pay', 'bank', 'transfer', 'deposit'],
    answer: 'We accept manual bank transfer. After applying for a course you will see the bank account details. Upload a screenshot or PDF of the deposit slip — admin confirms it within 1 business day.'
  },
  {
    keys: ['self paced', 'self-paced', 'pre recorded', 'pre-recorded', 'recorded', 'video lesson'],
    answer: 'Self-paced courses give you account-gated access to all video lessons, with quizzes after each module. You learn on your own schedule.'
  },
  {
    keys: ['live', 'live class', 'live session', 'live lesson', 'whatsapp', 'group class'],
    answer: 'Live courses use a WhatsApp group for class coordination — once your payment is confirmed an admin adds you. For 1-on-1 live coaching, book a slot from the Book Live page.',
    link: { label: 'Book a live session', to: '/book-live' }
  },
  {
    keys: ['student id', 'unique id', 'my id'],
    answer: "Every student gets a unique ID like EST-2026-00001 when they sign up. You'll find it on your dashboard."
  },
  {
    keys: ['testimonial', 'review', 'feedback', 'reviews'],
    answer: 'Read what past students have to say on the Testimonials page — written and video reviews.',
    link: { label: 'See testimonials', to: '/testimonials' }
  },
  {
    keys: ['quiz', 'quizzes', 'test', 'exam'],
    answer: 'Each self-paced lesson is followed by a short quiz. You can retake quizzes as many times as you want — your best score is recorded.'
  },
  {
    keys: ['certificate', 'certification', 'cert'],
    answer: 'A completion certificate is issued automatically when you reach 100% progress on a course and pass all quizzes.'
  },
  {
    keys: ['contact', 'support', 'help', 'whatsapp number', 'email'],
    answer: `For human support, email ${import.meta.env.VITE_SUPPORT_EMAIL || 'support@empireskills.example'} or message us on WhatsApp at ${import.meta.env.VITE_SUPPORT_WHATSAPP || '+000 000 0000'}.`
  },
  {
    keys: ['refund', 'cancel', 'cancellation'],
    answer: 'Refunds are available within 7 days of payment if you have not completed more than 20% of a course. Contact support to request one.'
  },
  {
    keys: ['mobile', 'phone', 'app'],
    answer: 'The site is fully responsive — it works on phones, tablets, and PCs. No app installation needed.'
  },
  {
    keys: ['forgot password', 'reset password', "can't login", 'cant login'],
    answer: 'Click Login → "Forgot password?" and enter your email. You will get a reset link.'
  },
  {
    keys: ['thanks', 'thank you', 'thx', 'ty'],
    answer: "You're welcome! Anything else I can help with?"
  },
  {
    keys: ['bye', 'goodbye', 'see you'],
    answer: "Goodbye — happy learning! 🎓"
  }
];

const FALLBACK = "I'm not sure I caught that. I can help with: courses, pricing, enrollment, payments, live sessions, quizzes, certificates, or password reset. Try rephrasing, or contact our support team.";

export function botReply(userText) {
  const t = (userText || '').toLowerCase().trim();
  if (!t) return { answer: FALLBACK };
  for (const entry of KB) {
    if (entry.keys.some((k) => t.includes(k))) {
      return { answer: entry.answer, link: entry.link };
    }
  }
  return { answer: FALLBACK };
}

export async function logChat({ userId, sessionId, role, content }) {
  if (!userId) return;
  try {
    await addDoc(collection(db, 'chatMessages'), {
      userId,
      sessionId,
      role,
      content,
      createdAt: serverTimestamp()
    });
  } catch { /* logging is best-effort */ }
}

export const SUGGESTED_PROMPTS = [
  'How do I enroll in a course?',
  'How does payment work?',
  'What live sessions are available?',
  'How do I reset my password?'
];
