import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { SERVICE_CATEGORIES } from '../lib/categories.js';
import {
  HEAR_ABOUT_OPTIONS, STUDENT_TYPES, buildIntake, sourceFromSlug
} from '../lib/intake.js';
import { getRegistrationLink } from '../lib/registrationLinks.js';
import Icon from '../components/Icon.jsx';
import Spinner from '../components/Spinner.jsx';

/**
 * The page a social-media campaign link points at. It asks the intake
 * questions and creates the account in one step, so someone arriving from a
 * post never has to find the signup form for themselves.
 *
 * /signup is untouched and still the plain way in; this page only adds the
 * questions and writes their answers to the profile as `intake`.
 */

/** Only ever send people on to a path inside this site. */
function safeNext(value) {
  const v = String(value || '');
  return /^\/(?!\/)/.test(v) ? v : '';
}

export default function Register() {
  const { firebaseUser, profile, loading, signup, saveMyProfile } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();

  // /r/<CODE> is the short form generated in the admin console; ?ref=<CODE> is
  // the same thing spelled out, for a link someone assembled by hand.
  const { code: pathCode } = useParams();
  const code = (pathCode || params.get('ref') || '').trim().toUpperCase();
  const [link, setLink] = useState(null);
  const [resolving, setResolving] = useState(!!code);

  useEffect(() => {
    if (!code) return;
    let live = true;
    getRegistrationLink(code)
      // An unknown or withdrawn code must never stop someone registering, so a
      // failed lookup just means no admin gets the credit.
      .then((found) => { if (live) setLink(found); })
      .catch(() => {})
      .finally(() => { if (live) setResolving(false); });
    return () => { live = false; };
  }, [code]);

  const campaignSource = link?.channel || sourceFromSlug(params.get('src'));
  const next = safeNext(params.get('next'))
    || (link?.courseId ? `/courses/${link.courseId}` : '');
  const selfPath = `${location.pathname}${location.search}`;

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    occupation: '',
    professionalArea: '',
    otherInterests: [],
    otherInterestsNote: '',
    studentType: '',
    heardAbout: '',
    heardAboutNote: '',
    password: '',
    confirm: '',
    subscribe: true
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [emailTaken, setEmailTaken] = useState(false);

  // Someone already signed in keeps their account — the form just collects the
  // answers. Only blank fields are filled, so this can never overwrite typing
  // when the profile arrives a moment after the page does.
  useEffect(() => {
    if (!profile) return;
    setForm((s) => ({
      ...s,
      fullName: s.fullName || profile.fullName || '',
      email: s.email || profile.email || '',
      phone: s.phone || profile.phone || '',
      occupation: s.occupation || profile.intake?.occupation || '',
      professionalArea: s.professionalArea || profile.intake?.professionalArea || '',
      otherInterests: s.otherInterests.length ? s.otherInterests : (profile.intake?.otherInterests || []),
      otherInterestsNote: s.otherInterestsNote || profile.intake?.otherInterestsNote || '',
      studentType: s.studentType || profile.intake?.studentType || 'Returning student',
      heardAbout: s.heardAbout || profile.intake?.heardAbout || ''
    }));
  }, [profile?.uid]);

  // The channel is known either from ?src= or from the link once it resolves.
  // It only ever fills a blank answer — the visitor's own choice always wins.
  useEffect(() => {
    if (!campaignSource || !HEAR_ABOUT_OPTIONS.includes(campaignSource)) return;
    setForm((s) => (s.heardAbout ? s : { ...s, heardAbout: campaignSource }));
  }, [campaignSource]);

  function update(field, value) {
    setForm((s) => ({ ...s, [field]: value }));
  }

  function toggleInterest(name) {
    setForm((s) => ({
      ...s,
      otherInterests: s.otherInterests.includes(name)
        ? s.otherInterests.filter((i) => i !== name)
        : [...s.otherInterests, name]
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setEmailTaken(false);

    if (!form.studentType) {
      toast.error('Please tell us whether you are a returning or first-time student');
      return;
    }
    if (!firebaseUser) {
      if (form.password !== form.confirm) {
        toast.error('Passwords do not match');
        return;
      }
      if (form.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
    }

    // A withdrawn link still works, but stops earning its owner the credit.
    const creditLink = link?.active ? link : null;
    const intake = {
      ...buildIntake(form, { campaignSource, link: creditLink }),
      submittedAt: serverTimestamp()
    };
    setBusy(true);
    try {
      if (firebaseUser) {
        await saveMyProfile({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          subscribedToUpdates: form.subscribe,
          intake
        });
        setDone({ studentId: profile?.studentId || '', returning: true });
      } else {
        const { studentId } = await signup({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          subscribeUpdates: form.subscribe,
          extra: { intake }
        });
        setDone({ studentId, returning: false });
      }
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setEmailTaken(true);
      } else {
        toast.error(err.message || 'Could not complete your registration');
      }
    } finally {
      setBusy(false);
    }
  }

  // Until auth resolves we do not know whether to ask for a password, and until
  // the code resolves we do not know who invited them.
  if (loading || resolving) return <Spinner />;

  if (done) {
    return (
      <div className="max-w-xl mx-auto container-px py-16">
        <div className="card p-8 text-center">
          <span className="icon-tile bg-emerald-100 text-emerald-700 mx-auto mb-5">
            <Icon name="check" size={24} strokeWidth={3} />
          </span>
          <h1 className="font-display text-2xl font-bold text-ink-900">
            {done.returning ? 'Thank you — your details are saved' : 'You are registered'}
          </h1>
          {done.studentId && (
            <p className="text-ink-600 mt-3">
              Your student ID is <span className="font-mono font-semibold text-brand-800">{done.studentId}</span>.
              Keep it — you will be asked for it when you pay for a course.
            </p>
          )}
          <p className="text-ink-600 mt-3">
            Pick the course you want and apply for it. A member of the team confirms your payment,
            and the lessons unlock as soon as it is approved.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Link to={next || '/courses'} className="btn btn-primary">
              {next ? 'Continue' : 'Browse courses'} <Icon name="arrow-right" size={16} />
            </Link>
            <Link to="/dashboard" className="btn btn-ghost">Go to my dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto container-px py-12">
      <div className="card p-6 sm:p-8">
        <span className="badge bg-accent-100 text-accent-700">Empire Skills Academy</span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900 mt-4 mb-2">
          Register your interest
        </h1>
        <p className="text-ink-600">
          {firebaseUser
            ? 'Fill this in so we can match you to the right course. Your account stays as it is.'
            : 'Tell us a little about yourself and we will create your student account as you go.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="label">Name</label>
            <input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)}
              className="input" placeholder="Jane Doe" />
          </div>

          <div>
            <label className="label">Email</label>
            <input type="email" required disabled={!!firebaseUser} value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="input disabled:bg-ink-50 disabled:text-ink-500" placeholder="you@email.com" />
            {emailTaken && (
              <p className="text-sm text-amber-700 mt-2">
                That email is already registered.{' '}
                <Link to="/login" state={{ from: selfPath }}
                  className="font-semibold text-brand-700 hover:underline">
                  Log in instead
                </Link>{' '}
                — you will come straight back here and your answers will be saved to that account.
              </p>
            )}
          </div>

          <div>
            <label className="label">Active mobile number</label>
            <input type="tel" required value={form.phone} onChange={(e) => update('phone', e.target.value)}
              className="input" placeholder="+260 97 000 0000" />
            <p className="text-xs text-ink-500 mt-1.5">
              Used for class reminders and the course WhatsApp group.
            </p>
          </div>

          <div>
            <label className="label">Current occupation</label>
            <input required value={form.occupation} onChange={(e) => update('occupation', e.target.value)}
              className="input" placeholder="Teacher, nurse, student, self-employed…" />
          </div>

          <div>
            <label className="label">Professional area of study</label>
            <input required value={form.professionalArea}
              onChange={(e) => update('professionalArea', e.target.value)}
              className="input" placeholder="Education, nursing, accounting, engineering…" />
          </div>

          <fieldset>
            <legend className="label">Other areas or courses you are interested in</legend>
            <div className="grid sm:grid-cols-2 gap-2 mt-1">
              {SERVICE_CATEGORIES.map((name) => (
                <label key={name}
                  className="flex items-start gap-2.5 rounded-lg border border-ink-200 px-3 py-2.5 cursor-pointer hover:border-brand-300 hover:bg-brand-50/40 transition">
                  <input type="checkbox" checked={form.otherInterests.includes(name)}
                    onChange={() => toggleInterest(name)}
                    className="mt-0.5 w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500" />
                  <span className="text-sm text-ink-700">{name}</span>
                </label>
              ))}
            </div>
            <input value={form.otherInterestsNote}
              onChange={(e) => update('otherInterestsNote', e.target.value)}
              className="input mt-2" placeholder="Anything else you would like us to run (optional)" />
          </fieldset>

          <fieldset>
            <legend className="label">Are you a returning or first-time student?</legend>
            <div className="flex flex-wrap gap-2 mt-1">
              {STUDENT_TYPES.map((type) => (
                <label key={type}
                  className={`rounded-lg border px-4 py-2.5 text-sm cursor-pointer transition ${
                    form.studentType === type
                      ? 'border-brand-600 bg-brand-50 text-brand-800 font-semibold'
                      : 'border-ink-200 text-ink-700 hover:border-brand-300'
                  }`}>
                  {/* Not `required`: the input is visually hidden, and a hidden
                      control that fails validation blocks submit with no
                      message the visitor can see. Checked in handleSubmit. */}
                  <input type="radio" name="studentType" value={type}
                    checked={form.studentType === type}
                    onChange={() => update('studentType', type)} className="sr-only" />
                  {type}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="label">How did you hear about us?</label>
            <select required value={form.heardAbout} onChange={(e) => update('heardAbout', e.target.value)}
              className="input">
              <option value="">Choose one…</option>
              {HEAR_ABOUT_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {form.heardAbout === 'Other' && (
              <input required value={form.heardAboutNote}
                onChange={(e) => update('heardAboutNote', e.target.value)}
                className="input mt-2" placeholder="Where did you hear about us?" />
            )}
          </div>

          {!firebaseUser && (
            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-ink-100">
              <div className="sm:col-span-2 pt-3">
                <p className="text-sm font-semibold text-ink-800">Choose a password</p>
                <p className="text-xs text-ink-500 mt-0.5">This is how you will sign back in.</p>
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" required minLength={6} value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  className="input" placeholder="At least 6 characters" />
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input type="password" required minLength={6} value={form.confirm}
                  onChange={(e) => update('confirm', e.target.value)} className="input" />
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={form.subscribe}
              onChange={(e) => update('subscribe', e.target.checked)}
              className="mt-1 w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500" />
            Send me course updates and free learning tips by email.
          </label>

          <button disabled={busy} className="btn btn-primary w-full">
            {busy
              ? 'Submitting…'
              : firebaseUser ? 'Save my details' : 'Register and create my account'}
          </button>
        </form>

        {!firebaseUser && (
          <p className="text-sm text-center text-ink-600 mt-5">
            Already have an account?{' '}
            <Link to="/login" state={{ from: selfPath }}
              className="text-brand-700 font-semibold">Log in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
