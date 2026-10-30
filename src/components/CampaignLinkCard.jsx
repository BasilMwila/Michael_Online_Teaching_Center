import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createRegistrationLink, listMyRegistrationLinks, registrationLinkUrl
} from '../lib/registrationLinks.js';
import Icon from './Icon.jsx';

/**
 * The admin's own registration link, one click from signing in.
 *
 * It shows their most recent link, or makes one on the spot if they have none.
 * Anything more involved — a link per platform, per course, or the numbers each
 * one has brought in — lives on the Registration links page.
 */
export default function CampaignLinkCard() {
  const { firebaseUser, profile } = useAuth();
  const [links, setLinks] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    if (!firebaseUser) return;
    listMyRegistrationLinks(firebaseUser.uid)
      .then(setLinks)
      .catch(() => setLinks([]));
  }, [firebaseUser?.uid]);

  const newest = links?.find((l) => l.active) || links?.[0] || null;
  const url = newest ? registrationLinkUrl(newest.code) : '';

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Your registration link is copied');
    } catch {
      input.current?.focus();
      input.current?.select();
      toast('Select and copy the link below.');
    }
  }

  async function generate() {
    setBusy(true);
    try {
      const link = await createRegistrationLink({
        ownerId: firebaseUser.uid,
        ownerName: profile?.fullName || profile?.email || 'Empire Skills Academy'
      });
      setLinks((s) => [link, ...(s || [])]);
      try {
        await navigator.clipboard.writeText(registrationLinkUrl(link.code));
        toast.success('Link generated and copied');
      } catch {
        toast.success('Link generated');
      }
    } catch (err) {
      toast.error(err.message || 'Could not generate a link');
    } finally {
      setBusy(false);
    }
  }

  if (!links) return null;

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <span className="icon-tile bg-brand-100 text-brand-700 shrink-0">
          <Icon name="send" size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-ink-900">Your registration link</h2>
          <p className="text-sm text-ink-600 mt-1">
            Put this in your posts. Whoever opens it fills in the registration form, gets a student
            account, and is credited to you.
          </p>

          {newest ? (
            <>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <input ref={input} readOnly aria-label="Your registration link" value={url}
                  onFocus={(e) => e.target.select()} className="input flex-1 min-w-0 text-xs" />
                <button type="button" onClick={copyLink} className="btn-secondary text-xs">Copy link</button>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="text-brand-700 text-xs hover:underline px-1">Preview</a>
              </div>
              <p className="text-xs text-ink-500 mt-2.5">
                Code <span className="font-mono font-semibold">{newest.code}</span>
                {newest.channel ? ` · tagged ${newest.channel}` : ''}
                {' · '}
                <Link to="/admin/links" className="text-brand-700 hover:underline">
                  manage links and see how many each one brought in
                </Link>
              </p>
            </>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={generate} disabled={busy} className="btn-primary">
                {busy ? 'Generating…' : 'Generate my link'}
              </button>
              <Link to="/admin/links" className="text-sm text-brand-700 hover:underline">
                or make one per platform
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
