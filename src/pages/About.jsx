import PageHeader from '../components/PageHeader.jsx';

export default function About() {
  return (
    <div>
      <PageHeader title="About Empire Skills" subtitle="Practical skills, modern delivery, real outcomes." />
      <div className="max-w-4xl mx-auto container-px py-12 space-y-8 text-gray-700 leading-relaxed">
        <p>
          Empire Skills Training Center exists to make high-quality, practical skills training
          accessible to anyone with an internet connection. We blend self-paced video lessons,
          short reinforcing quizzes, and live coaching sessions so learners can move at their
          own pace without losing the support of a real instructor.
        </p>
        <div className="grid sm:grid-cols-3 gap-6 my-10">
          <Stat number="100%" label="Online & self-paced" />
          <Stat number="∞" label="Lifetime course access" />
          <Stat number="24/7" label="Chatbot support" />
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900">Our approach</h2>
        <p>
          Every learner receives a unique student ID at signup — used for course access,
          certificates, and support. Self-paced courses are delivered as video lessons paired
          with quizzes; live courses are coordinated via private WhatsApp groups. For one-on-one
          coaching, learners can book a slot directly from the calendar.
        </p>
        <h2 className="text-2xl font-display font-bold text-gray-900">Why we built this</h2>
        <p>
          Traditional training is expensive, slow, and disconnected from how people actually
          learn online. Empire Skills focuses on three things: clear pricing (one-time bank
          transfer), real outcomes (every course ends with practical work you can showcase),
          and approachable instructors (you can always reach a human via the contact page or
          WhatsApp).
        </p>
      </div>
    </div>
  );
}

function Stat({ number, label }) {
  return (
    <div className="card p-5 text-center">
      <div className="text-3xl font-bold text-brand-700">{number}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}
