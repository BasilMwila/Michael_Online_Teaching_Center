import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Puts a new page at the top, the way a normal site does.
 *
 * A single-page app swaps the content without touching the scroll position, so
 * following a link from the footer used to drop you into the middle of the new
 * page with nothing visible but its bottom.
 *
 * Going back or forward is left alone on purpose: the browser restores where
 * you were, which is the whole point of pressing back.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === 'POP') return;

    // A link to #something on the page should still land on that section.
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }

    window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);

  return null;
}
