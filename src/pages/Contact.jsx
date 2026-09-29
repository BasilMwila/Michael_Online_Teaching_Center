import PageHeader from '../components/PageHeader.jsx';
import Icon from '../components/Icon.jsx';

const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@empireskills.example';
const supportWhatsapp = import.meta.env.VITE_SUPPORT_WHATSAPP || '+000 000 0000';
const whatsappMessage = encodeURIComponent(
  "Hello Empire Skills Academy, I'd like to know more about your courses."
);

export default function Contact() {
  return (
    <div>
      <PageHeader title="Get in touch" subtitle="Questions about courses, payments, or live sessions? We typically reply within one business day." />
      <div className="max-w-5xl mx-auto container-px py-12 grid md:grid-cols-2 gap-8">
        <div className="card p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
            <a href={`mailto:${supportEmail}`} className="text-brand-700 hover:underline">{supportEmail}</a>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">WhatsApp</h3>
            <a
              href={`https://wa.me/${supportWhatsapp.replace(/\D/g, '')}?text=${whatsappMessage}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-white font-semibold
                         shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all"
              style={{ backgroundColor: '#25D366' }}
            >
              <Icon name="whatsapp" size={20} />
              Chat on WhatsApp
            </a>
            <p className="text-sm text-gray-600 mt-2">{supportWhatsapp}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Office hours</h3>
            <p className="text-gray-600">Mon–Fri · 9:00am – 6:00pm</p>
          </div>
          <div className="pt-3 border-t">
            <h3 className="font-semibold text-gray-900 mb-1">Chatbot</h3>
            <p className="text-gray-600 text-sm">Use the chat bubble in the bottom-right corner for instant answers to common questions.</p>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Send a message</h3>
          <form
            action={`mailto:${supportEmail}`}
            method="post"
            encType="text/plain"
            className="space-y-3"
          >
            <div>
              <label className="label">Your name</label>
              <input name="name" required className="input" />
            </div>
            <div>
              <label className="label">Your email</label>
              <input type="email" name="email" required className="input" />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea name="message" rows={5} required className="input"></textarea>
            </div>
            <button type="submit" className="btn-primary w-full">Send</button>
            <p className="text-xs text-gray-500 text-center">Opens your email app with the message ready to send.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
