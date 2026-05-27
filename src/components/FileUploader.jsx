import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { uploadToCloudinary } from '../lib/cloudinary.js';
import Icon from './Icon.jsx';

const ACCEPT_PRESETS = {
  video: 'video/*',
  image: 'image/*',
  pdf: 'application/pdf,.pdf',
  any: ''
};

const MAX_SIZE_MB = {
  video: 100,
  image: 10,
  pdf: 25,
  any: 100
};

export default function FileUploader({
  label,
  accept = 'any',
  folder,
  resourceType = 'auto',
  currentUrl,
  onUploaded,
  onClear,
  helperText
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filename, setFilename] = useState('');

  const maxMb = MAX_SIZE_MB[accept] ?? 100;

  async function handleChoose(file) {
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`File too large — max ${maxMb}MB`);
      return;
    }
    setBusy(true);
    setProgress(0);
    setFilename(file.name);
    try {
      const { url } = await uploadToCloudinary(file, {
        folder,
        resourceType,
        onProgress: setProgress
      });
      onUploaded?.({ url, name: file.name, sizeBytes: file.size, type: file.type });
      toast.success(`${file.name} uploaded`);
    } catch (e) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setBusy(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleChoose(file);
  }

  return (
    <div>
      {label && <label className="label">{label}</label>}
      {currentUrl && !busy ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-brand-200 bg-brand-50">
          <div className="icon-tile bg-brand-100 text-brand-700 w-10 h-10">
            <Icon name={accept === 'video' ? 'video' : accept === 'pdf' ? 'book-open' : 'check'} size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">{filename || 'Uploaded file'}</p>
            <a href={currentUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-700 hover:underline truncate block">
              {currentUrl}
            </a>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-brand-700 font-semibold hover:underline"
          >
            Replace
          </button>
          {onClear && (
            <button
              type="button"
              onClick={() => { onClear(); setFilename(''); }}
              className="text-xs text-red-600 font-semibold hover:underline"
            >
              Remove
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_PRESETS[accept]}
            className="hidden"
            onChange={(e) => handleChoose(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !busy && inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
            busy
              ? 'border-brand-300 bg-brand-50 cursor-wait'
              : 'border-ink-200 hover:border-brand-400 hover:bg-brand-50/40'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_PRESETS[accept]}
            className="hidden"
            onChange={(e) => handleChoose(e.target.files?.[0])}
          />
          {busy ? (
            <>
              <div className="icon-tile mx-auto bg-brand-100 text-brand-700 mb-3">
                <Icon name="video" size={22} />
              </div>
              <p className="text-sm font-medium text-ink-900 truncate">{filename}</p>
              <p className="text-xs text-ink-500 mt-1">Uploading… {progress}%</p>
              <div className="mt-3 h-1.5 bg-ink-100 rounded-full overflow-hidden mx-auto max-w-xs">
                <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <>
              <div className="icon-tile mx-auto bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 mb-3">
                <Icon name={accept === 'video' ? 'video' : accept === 'pdf' ? 'book-open' : accept === 'image' ? 'sparkles' : 'check'} size={22} />
              </div>
              <p className="text-sm font-medium text-ink-900">
                <span className="text-brand-700">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-ink-500 mt-1">
                {helperText || `Max ${maxMb}MB${accept !== 'any' ? ` · ${accept.toUpperCase()} files` : ''}`}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
