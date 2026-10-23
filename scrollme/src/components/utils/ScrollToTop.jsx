import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Scrolls to the top whenever the page (pathname) changes.
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  }, [pathname]);

  return null; // this component doesn't render anything, hence null
};

export default ScrollToTop;
