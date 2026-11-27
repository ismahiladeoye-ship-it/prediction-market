import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Scrolls to the top whenever the page (pathname) changes, or to the section a
// link points at (e.g. /privacy#cookies) once the page has drawn it.
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      let tries = 0;
      const find = () => {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else if (tries++ < 20) timer = setTimeout(find, 100);
      };
      let timer = setTimeout(find, 0);
      return () => clearTimeout(timer);
    }
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
    return undefined;
  }, [pathname, hash]);

  return null; // this component doesn't render anything, hence null
};

export default ScrollToTop;
