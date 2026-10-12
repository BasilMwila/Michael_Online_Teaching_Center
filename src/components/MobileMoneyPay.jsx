import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from './Icon.jsx';
import {
  startMobileMoneyPayment, getMobileMoneyStatus, getMobileMoneyConfig, recordMobileMoneyPayment
} from '../lib/payments.js';

// Zambia's mobile money providers, in their own brand colours. These are
// colour-and-name tiles rather than the operators' logo artwork.
const OPERATORS = [
  { id: 'airtel', name: 'Airtel Money', bg: '#E40000', fg: '#ffffff', prefixes: '097 / 077' },
  { id: 'mtn', name: 'MTN MoMo', bg: '#FFCC00', fg: '#1a1a1a', prefixes: '096 / 076' },
  { id: 'zamtel', name: 'Zamtel Kwacha', bg: '#00A651', fg: '#ffffff', prefixes: '095 / 075' }
];

const POLL_MS = 4000;
const MAX_POLLS = 75; // five minutes

export default function MobileMoneyPay({ enrollment, profile, onPaid }) {
  const [config, setConfig] = useState(null);
  const [operator, setOperator] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [stage, setStage] = useState('form'); // form | waiting | success | failed
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    getMobileMoneyConfig().then(setConfig).catch(() => setConfig({ configured: false }));
    return () => clearInterval(pollRef.current);
  }, []);

  // The rate comes from the server, which refreshes it from live FX feeds.
  const rate = config?.usdToZmw || null;
  const priced = (enrollment.currency || 'USD').toUpperCase();
  const kwachaAmount =
    priced === 'ZMW'
      ? enrollment.priceCents / 100
      : rate
        ? (enrollment.priceCents / 100) * rate
        : null;
  const canConvert = kwachaAmount != null;
  const kwachaLabel =
    kwachaAmount == null
      ? ''
      : `K${kwachaAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) {
      setError('Enter the mobile money number, including the leading zero.');
      return;
    }
    if (!operator) {
      setError('Choose the network the number is on.');
      return;
    }

    setStage('waiting');
    try {
      const res = await startMobileMoneyPayment({
        amountCents: enrollment.priceCents,
        phone: digits,
        operator,
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
        courseTitle: enrollment.courseTitle,
        currency: enrollment.currency || 'USD'
      });
      setReference(res.reference);
      beginPolling(res.reference);
    } catch (err) {
      setStage('failed');
      setError(err.message || 'Could not start the payment.');
    }
  }

  function beginPolling(ref) {
    let tries = 0;
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      tries += 1;
      try {
        const res = await getMobileMoneyStatus(ref);
        if (res.status === 'successful') {
          clearInterval(pollRef.current);
          await finish(ref);
        } else if (res.status === 'failed') {
          clearInterval(pollRef.current);
          setStage('failed');
          setError(res.reasonForFailure || 'The payment was not completed.');
        }
      } catch {
        // A blip while polling isn't fatal â€” keep trying.
      }
      if (tries >= MAX_POLLS) {
        clearInterval(pollRef.current);
        setStage('failed');
        setError('We did not get a confirmation in time. If you were charged, contact us with your reference.');
      }
    }, POLL_MS);
  }

  async function finish(ref) {
    try {
      await recordMobileMoneyPayment({
        userId: enrollment.userId,
        studentId: profile?.studentId,
        courseId: enrollment.courseId,
        courseTitle: enrollment.courseTitle,
        enrollmentId: enrollment.id,
        amountCents: Math.round(kwachaAmount * 100),
        currency: 'ZMW',
        reference: ref,
        phone,
        operator
      });
      setStage('success');
      toast.success('Payment received');
      onPaid?.();
    } catch (err) {
      // The money is in â€” a failure here is only about our own record.
      setStage('success');
      toast.error('Payment received, but we could not file the record. Contact us with your reference.');
      console.error(err);
    }
  }

  // ---------- Not switched on ----------
  if (config && !config.configured) {
    return (
      <div className="card p-6">
        <div className="icon-tile bg-accent-100 text-accent-700 mb-4"><Icon name="lock" size={22} /></div>
        <h3 className="font-semibold text-lg text-ink-900">Mobile money isn&rsquo;t available yet</h3>
        <p className="mt-2 text-sm text-ink-600">
          Please use bank transfer for now, or contact us and we will help you pay.
        </p>
      </div>
    );
  }

  // ---------- No exchange rate configured ----------
  if (!canConvert) {
    return (
      <div className="card p-6">
        <div className="icon-tile bg-accent-100 text-accent-700 mb-4"><Icon name="lock" size={22} /></div>
        <h3 className="font-semibold text-lg text-ink-900">Mobile money is being set up</h3>
        <p className="mt-2 text-sm text-ink-600 leading-relaxed">
          We couldn&rsquo;t fetch today&rsquo;s Kwacha rate just now. Please try again in a moment,
          use bank transfer, or contact us for the Kwacha amount.
        </p>
      </div>
    );
  }

  // ---------- Waiting for the customer to approve ----------
  if (stage === 'waiting') {
    return (
      <div className="card p-6 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin" />
        <h3 className="font-display font-bold text-lg text-ink-900">Check your phone</h3>
        <p className="mt-2 text-sm text-ink-600 leading-relaxed max-w-sm mx-auto">
          We&rsquo;ve sent a request for <span className="font-semibold">{kwachaLabel}</span>{' '}
          to <span className="font-semibold">{phone}</span>. Approve it with your mobile money PIN, then
          wait here â€” this page updates on its own.
        </p>
        {reference && (
          <p className="mt-4 text-xs text-ink-500">
            Reference <span className="font-mono">{reference}</span>
          </p>
        )}
        <p className="mt-4 text-xs text-ink-400">Keep this page open until it confirms.</p>
      </div>
    );
  }

  // ---------- Paid ----------
  if (stage === 'success') {
    return (
      <div className="card p-6 text-center">
        <div className="icon-tile w-16 h-16 mx-auto bg-emerald-100 text-emerald-700 mb-4">
          <Icon name="check" size={28} strokeWidth={2.5} />
        </div>
        <h3 className="font-display font-bold text-lg text-ink-900">Payment received</h3>
        <p className="mt-2 text-sm text-ink-600 max-w-sm mx-auto leading-relaxed">
          Thank you. Your payment of {kwachaLabel} came through.
          We&rsquo;ll unlock the course shortly â€” you&rsquo;ll see it on your dashboard.
        </p>
        <p className="mt-4 text-xs text-ink-500">Reference <span className="font-mono">{reference}</span></p>
      </div>
    );
  }

  // ---------- Form (and retry after failure) ----------
  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      <div>
        <h3 className="font-semibold text-lg text-ink-900">Pay with mobile money</h3>
        <p className="text-sm text-ink-600 mt-1">
          You&rsquo;ll approve the payment on your phone. Amount:{' '}
          <span className="font-semibold text-brand-700">
            {kwachaLabel}
          </span>
        </p>
      </div>

      <div>
        <label className="label">Choose your network</label>
        <div className="grid grid-cols-3 gap-2.5">
          {OPERATORS.map((op) => {
            const selected = operator === op.id;
            return (
              <button
                key={op.id}
                type="button"
                onClick={() => setOperator(op.id)}
                aria-pressed={selected}
                className={`rounded-xl p-3 text-center transition-all border-2 ${
                  selected
                    ? 'border-brand-600 shadow-lift -translate-y-0.5'
                    : 'border-transparent hover:-translate-y-0.5 hover:shadow-soft'
                }`}
                style={{ backgroundColor: op.bg, color: op.fg }}
              >
                <span className="block font-bold text-sm leading-tight">{op.name}</span>
                <span className="block text-[11px] opacity-80 mt-1">{op.prefixes}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label">Mobile money number</label>
        <input
          type="tel"
          inputMode="numeric"
          className="input"
          placeholder="0971234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <p className="text-xs text-ink-500 mt-1.5">
          The number must be registered for mobile money and have enough balance.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      <button type="submit" className="btn-primary w-full">
        <Icon name="credit-card" size={16} />
        Pay {kwachaLabel}
      </button>
    </form>
  );
}

