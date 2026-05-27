import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { listMyEnrollments } from '../../lib/enrollments.js';
import { submitTestimonial } from '../../lib/testimonials.js';
import PageHeader from '../../components/PageHeader.jsx';

export default function SubmitTestimonial() {
  const { firebaseUser, profile } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [form, setForm] = useState({
    courseId: '',
    content: '',
    rating: 5,
    videoFile: null
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;
    listMyEnrollments(firebaseUser.uid).then((list) => {
      setEnrollments(list.filter((e) => e.status === 'active' || e.status === 'completed'));
    });
  }, [firebaseUser]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.content.trim()) {
      toast.error('Please write a short message');
      return;
    }
    setBusy(true);
    try {
      await submitTestimonial({
        userId: firebaseUser.uid,
        authorName: profile.fullName,
        courseId: form.courseId || null,
        content: form.content.trim(),
        rating: Number(form.rating),
        videoFile: form.videoFile
      });
      toast.success('Thank you! Your testimonial is awaiting review.');
      navigate('/dashboard');
    } catch {
      toast.error('Could not submit testimonial');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Share your story" subtitle="Help future learners by telling us about your experience." />
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto container-px py-8 space-y-5">
        <div className="card p-6 space-y-4">
          <div>
            <label className="label">Which course is this about? (optional)</label>
            <select value={form.courseId} onChange={(e) => setForm((s) => ({ ...s, courseId: e.target.value }))} className="input">
              <option value="">— General testimonial —</option>
              {enrollments.map((e) => <option key={e.courseId} value={e.courseId}>{e.courseTitle}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Rating</label>
            <div className="flex gap-1 text-3xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, rating: n }))}
                  className={n <= form.rating ? 'text-amber-400' : 'text-gray-300'}
                  aria-label={`${n} stars`}
                >★</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Your testimonial</label>
            <textarea
              required
              rows={5}
              value={form.content}
              onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
              className="input"
              placeholder="What did you learn? How did this course help you?"
            />
          </div>
          <div>
            <label className="label">Optional: upload a short video testimonial (max 50MB)</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setForm((s) => ({ ...s, videoFile: e.target.files[0] }))}
              className="input file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-brand-100 file:text-brand-700"
            />
          </div>
        </div>
        <button disabled={busy} className="btn-primary w-full">
          {busy ? 'Submitting…' : 'Submit testimonial'}
        </button>
        <p className="text-xs text-gray-500 text-center">Testimonials are reviewed before being published on the site.</p>
      </form>
    </div>
  );
}
