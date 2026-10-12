import { useRef } from 'react';
import toast from 'react-hot-toast';

export default function CourseShareLink({ courseId, isPublished }) {
  const input = useRef(null);
  const url = `${window.location.origin}/courses/${encodeURIComponent(courseId)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Course link copied');
    } catch {
      input.current?.focus();
      input.current?.select();
      toast('Select and copy the course link below.');
    }
  }

  return (
    <div className="space-y-2 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} aria-label="Shareable course link" readOnly value={url}
          onFocus={(e) => e.target.select()} className="input flex-1 min-w-0 text-xs" />
        <button type="button" onClick={copyLink} className="btn-secondary text-xs">Copy link</button>
        {isPublished && <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-brand-700 text-xs hover:underline">Open course</a>}
      </div>
      {!isPublished && <p className="text-xs text-amber-700">Publish this course before sharing the link with students.</p>}
    </div>
  );
}
