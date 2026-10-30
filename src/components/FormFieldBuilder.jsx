import { FIELD_TYPES, MAX_FIELDS, MAX_LABEL, blankField } from '../lib/formFields.js';
import Icon from './Icon.jsx';

/**
 * Builds the extra questions attached to one registration link.
 *
 * Kept deliberately plain: a question, how it should be answered, and whether
 * it has to be answered. Anything more elaborate belongs in a real form
 * builder, and this has to be usable by whoever is about to make a post.
 */
export default function FormFieldBuilder({ fields, onChange }) {
  const set = (id, patch) =>
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const add = () => onChange([...fields, blankField()]);
  const remove = (id) => onChange(fields.filter((f) => f.id !== id));

  const move = (index, delta) => {
    const next = [...fields];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-sm text-ink-500">
          Everyone who opens this link is asked the standard questions — name, email, mobile,
          occupation, area of study, interests, returning or new, and how they heard about you.
          Add anything else you need for this campaign.
        </p>
      )}

      {fields.map((f, i) => (
        <div key={f.id} className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs text-ink-400 mt-3 w-5 shrink-0">{i + 1}.</span>
            <div className="flex-1 min-w-0 space-y-3">
              <input
                value={f.label}
                maxLength={MAX_LABEL}
                onChange={(e) => set(f.id, { label: e.target.value })}
                className="input"
                placeholder="What do you want to ask? e.g. Which intake do you want to join?"
              />

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={f.type}
                  onChange={(e) => set(f.id, { type: e.target.value })}
                  className="input w-auto"
                >
                  {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>

                <label className="flex items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) => set(f.id, { required: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                  />
                  Must be answered
                </label>

                <div className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                    aria-label="Move question up"
                    className="p-1.5 rounded text-ink-500 hover:bg-ink-100 disabled:opacity-30">
                    <Icon name="arrow-right" size={14} className="-rotate-90" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === fields.length - 1}
                    aria-label="Move question down"
                    className="p-1.5 rounded text-ink-500 hover:bg-ink-100 disabled:opacity-30">
                    <Icon name="arrow-right" size={14} className="rotate-90" />
                  </button>
                  <button type="button" onClick={() => remove(f.id)}
                    aria-label="Remove question"
                    className="p-1.5 rounded text-red-600 hover:bg-red-50">
                    <Icon name="x" size={14} />
                  </button>
                </div>
              </div>

              {f.type === 'select' && (
                <div>
                  <label className="label text-xs">Answers to choose from, one per line</label>
                  <textarea
                    rows={3}
                    value={(f.options || []).join('\n')}
                    onChange={(e) => set(f.id, { options: e.target.value.split('\n') })}
                    className="input font-mono text-xs"
                    placeholder={'January intake\nMarch intake\nNot sure yet'}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {fields.length < MAX_FIELDS && (
        <button type="button" onClick={add} className="btn-secondary text-sm">
          <Icon name="check" size={14} /> Add a question
        </button>
      )}
      {fields.length >= MAX_FIELDS && (
        <p className="text-xs text-ink-500">That is the most questions one link can ask ({MAX_FIELDS}).</p>
      )}
    </div>
  );
}
