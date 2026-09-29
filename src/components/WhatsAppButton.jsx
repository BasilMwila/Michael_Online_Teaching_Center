import Icon from './Icon.jsx';

// WhatsApp's own brand green, so the button is recognised instantly.
const BRAND_GREEN = '#25D366';

/**
 * Floating WhatsApp button shown on every page.
 * Sits bottom-left so it never collides with the chatbot bubble on the right.
 */
export default function WhatsAppButton() {
  const raw = import.meta.env.VITE_SUPPORT_WHATSAPP || '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  const message = encodeURIComponent(
    "Hello Empire Skills Academy, I'd like to know more about your courses."
  );

  return (
    <a
      href={`https://wa.me/${digits}?text=${message}`}
      target="_blank"
      rel="noreferrer"
      aria-label={`Chat with Empire Skills Academy on WhatsApp at ${raw}`}
      title="Chat with us on WhatsApp"
      className="group fixed bottom-5 left-5 z-40 flex items-center rounded-full text-white shadow-lift
                 transition-all duration-300 pl-0 hover:pl-4 hover:shadow-glow"
      style={{ backgroundColor: BRAND_GREEN }}
    >
      {/* The label unfurls on hover; hidden on phones to stay out of the way. */}
      <span
        className="hidden sm:block max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold
                   transition-all duration-300 group-hover:max-w-[140px]"
      >
        Chat with us
      </span>
      <span className="w-14 h-14 grid place-items-center flex-shrink-0">
        <Icon name="whatsapp" size={28} />
      </span>
    </a>
  );
}
