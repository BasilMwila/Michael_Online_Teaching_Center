import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from './Icon.jsx';
import { getAiStatus, segmentDocument, flattenModules, saveLessonsToCourse } from '../lib/aiIngest.js';

const STAGES = {
  idle: '',
  uploading: 'Uploading document…',
  thinking: 'Reading the document and splitting it into lessons — this can take a minute or two…',
  saving: 'Saving lessons…'
};

export default function DocumentToLessons({ courseId, courseTitle, existingCount = 0, onImported }) {
  const [status, setStatus] = useState(null);
  const [file, setFile] = useState(null);
  const [hint, setHint] = useState('');
  const [stage, setStage] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [skipped, setSkipped] = useState(() => new Set());
  const [saveCount, setSaveCount] = useState({ done: 0, total: 0 });
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    getAiStatus().then(setStatus).catch(() => setStatus({ unreachable: true }));
  }, []);

  const busy = stage !== 'idle';

  function pickFile(f) {
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    const allowed = status?.supported || ['pdf', 'pptx', 'docx', 'txt', 'md'];
    if (!allowed.includes(ext)) {
      toast.error(`Upload a ${allowed.join(', ')} file.`);
      return;
    }
    setFile(f);
    setResult(null);
  }

  async function handleGenerate() {
    if (!file) return;
    setStage('uploading');
    setProgress(0);
    abortRef.current = new AbortController();
    try {
      const data = await segmentDocument({
        file,
        courseTitle,
        hint,
        signal: abortRef.current.signal,
        onProgress: (p) => {
          setProgress(p);
          if (p >= 100) setStage('thinking');
        }
      });
      setResult(data);
      setSkipped(new Set());
      toast.success(`${data.meta.moduleCount} modules · ${data.meta.lessonCount} lessons drafted`);
    } catch (err) {
      toast.error(err.message || 'Could not process that document.');
    } finally {
      setStage('idle');
      setProgress(0);
    }
  }

  function toggleLesson(key) {
    setSkipped((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function editField(mi, li, field, value) {
    setResult((r) => {
      const modules = r.modules.map((m, i) => {
        if (i !== mi) return m;
        if (li === null) return { ...m, [field]: value };
        return { ...m, lessons: m.lessons.map((l, j) => (j === li ? { ...l, [field]: value } : l)) };
      });
      return { ...r, modules };
    });
  }

  const kept = result
    ? result.modules
        .map((m, mi) => ({ ...m, lessons: m.lessons.filter((_, li) => !skipped.has(`${mi}:${li}`)) }))
        .filter((m) => m.lessons.length)
    : [];
  const keptCount = kept.reduce((n, m) => n + m.lessons.length, 0);

  async function handleImport() {
    if (!keptCount) return;
    setStage('saving');
    const lessons = flattenModules(kept, existingCount);
    setSaveCount({ done: 0, total: lessons.length });
    try {
      await saveLessonsToCourse(courseId, lessons, (done, total) => setSaveCount({ done, total }));
      toast.success(`${lessons.length} lessons added to the course`);
      setResult(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      onImported?.();
    } catch (err) {
      toast.error(err.message || 'Some lessons could not be saved.');
    } finally {
      setStage('idle');
    }
  }

  // ---------- Not configured yet ----------
  if (status && (status.unreachable || !status.configured || !status.adminGateReady)) {
    return (
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="icon-tile bg-accent-100 text-accent-700 flex-shrink-0">
            <Icon name="lock" size={22} />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-ink-900">AI import isn&rsquo;t switched on yet</h3>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              {status.unreachable
                ? 'The API could not be reached, so the AI import is unavailable.'
                : !status.configured
                  ? 'The server still needs an OpenAI API key (OPENAI_API_KEY) before documents can be segmented.'
                  : 'The server needs ADMIN_EMAILS and FIREBASE_PROJECT_ID set so it can confirm who may run imports.'}
            </p>
            <p className="mt-2 text-xs text-ink-500">
              Add the setting to <code className="font-mono">server/.env</code> and restart the API.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* UPLOAD */}
      <div className="card p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="icon-tile bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 flex-shrink-0">
            <Icon name="sparkles" size={22} />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-ink-900">Turn a document into lessons</h3>
            <p className="mt-1 text-sm text-ink-600 leading-relaxed">
              Upload a lecture PDF, PowerPoint or Word file. It gets split into modules and
              lessons by topic, which you can review and edit before anything is added.
            </p>
          </div>
        </div>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
          className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            busy ? 'border-ink-200 opacity-60 pointer-events-none' : 'border-ink-200 hover:border-brand-400 hover:bg-brand-50/30'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.pptx,.docx,.txt,.md"
            onChange={(e) => pickFile(e.target.files?.[0])}
            disabled={busy}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <div className="icon-tile w-10 h-10 bg-brand-100 text-brand-700"><Icon name="book-open" size={18} /></div>
              <div className="text-left">
                <p className="font-medium text-ink-900">{file.name}</p>
                <p className="text-xs text-ink-500">{(file.size / 1024 / 1024).toFixed(2)} MB · click to change</p>
              </div>
            </div>
          ) : (
            <>
              <Icon name="book-open" size={28} className="mx-auto text-ink-400" />
              <p className="mt-3 text-sm text-ink-700">
                <span className="text-brand-700 font-semibold">Choose a document</span> or drag it here
              </p>
              <p className="mt-1 text-xs text-ink-500">
                PDF, PPTX, DOCX, TXT · up to {status?.maxFileMb || 25} MB
              </p>
            </>
          )}
        </label>

        <div className="mt-4">
          <label className="label">Anything the AI should know? (optional)</label>
          <input
            className="input"
            placeholder="e.g. Skip the introduction chapter; keep the case studies as their own lessons"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            disabled={busy}
          />
        </div>

        {busy && stage !== 'saving' && (
          <div className="mt-5">
            <div className="w-full bg-ink-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${stage === 'thinking' ? 'bg-accent-500 animate-pulse w-full' : 'bg-brand-600'}`}
                style={stage === 'thinking' ? undefined : { width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-ink-600">{STAGES[stage]}</p>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button onClick={handleGenerate} disabled={!file || busy} className="btn-primary">
            <Icon name="sparkles" size={16} />
            {stage === 'idle' ? 'Generate lessons' : 'Working…'}
          </button>
          {busy && stage !== 'saving' && (
            <button onClick={() => abortRef.current?.abort()} className="btn-secondary">Cancel</button>
          )}
        </div>
      </div>

      {/* REVIEW */}
      {result && (
        <div className="card p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
            <h3 className="font-display font-bold text-lg text-ink-900">Review before importing</h3>
            <span className="badge bg-brand-50 text-brand-700">
              {keptCount} of {result.meta.lessonCount} lessons selected
            </span>
          </div>
          <p className="text-sm text-ink-600 mb-5">
            From <span className="font-medium">{result.source.filename}</span> ({result.source.sections}{' '}
            {result.source.kind === 'pptx' ? 'slides' : 'pages'}). Titles and notes are editable — untick anything you don&rsquo;t want.
          </p>

          <div className="space-y-5">
            {result.modules.map((mod, mi) => (
              <section key={mi} className="border border-ink-100 rounded-xl overflow-hidden">
                <div className="bg-ink-50/70 px-4 py-3 border-b border-ink-100">
                  <input
                    className="w-full bg-transparent font-display font-bold text-ink-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 rounded px-1.5 py-0.5"
                    value={mod.title}
                    onChange={(e) => editField(mi, null, 'title', e.target.value)}
                  />
                  {mod.summary && <p className="text-xs text-ink-500 mt-1 px-1.5">{mod.summary}</p>}
                </div>
                <div className="divide-y divide-ink-100">
                  {mod.lessons.map((lesson, li) => {
                    const key = `${mi}:${li}`;
                    const off = skipped.has(key);
                    return (
                      <div key={li} className={`p-4 ${off ? 'opacity-45' : ''}`}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={!off}
                            onChange={() => toggleLesson(key)}
                            className="mt-1.5 w-4 h-4 accent-brand-600 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <input
                              className="w-full font-semibold text-ink-900 bg-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 rounded px-1.5 py-0.5"
                              value={lesson.title}
                              onChange={(e) => editField(mi, li, 'title', e.target.value)}
                            />
                            <p className="text-xs text-ink-500 mt-1 px-1.5">
                              {lesson.summary}
                              {lesson.durationMinutes ? ` · ~${lesson.durationMinutes} min` : ''}
                            </p>
                            <details className="mt-2 px-1.5">
                              <summary className="text-xs font-medium text-brand-700 cursor-pointer">
                                Lesson notes ({lesson.bodyText.length.toLocaleString()} characters)
                              </summary>
                              <textarea
                                className="input mt-2 text-sm font-normal"
                                rows={8}
                                value={lesson.bodyText}
                                onChange={(e) => editField(mi, li, 'bodyText', e.target.value)}
                              />
                              {lesson.keyPoints?.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {lesson.keyPoints.map((p, pi) => (
                                    <li key={pi} className="flex gap-2 text-xs text-ink-600">
                                      <Icon name="check" size={13} className="text-accent-600 flex-shrink-0 mt-0.5" />
                                      <span>{p}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </details>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {stage === 'saving' && (
            <div className="mt-5">
              <div className="w-full bg-ink-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand-600 h-2 rounded-full transition-all"
                  style={{ width: `${saveCount.total ? (saveCount.done / saveCount.total) * 100 : 0}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-ink-600">Saving lesson {saveCount.done} of {saveCount.total}…</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <button onClick={handleImport} disabled={!keptCount || busy} className="btn-primary">
              <Icon name="check" size={16} />
              Add {keptCount} lesson{keptCount === 1 ? '' : 's'} to the course
            </button>
            <button onClick={() => setResult(null)} disabled={busy} className="btn-secondary">Discard</button>
            {existingCount > 0 && (
              <p className="text-xs text-ink-500">
                These are added after the {existingCount} lesson{existingCount === 1 ? '' : 's'} already in this course.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
