import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Nav from './components/layout/Nav';
import Footer from './components/layout/Footer';
import Landing from './pages/Landing';
import CodeStudio from './pages/CodeStudio';
import AIReview from './pages/AIReview';
import History from './pages/History';
import './App.css';

// Watches for elements with the `.reveal` class and adds `.visible` once
// they scroll into view. Re-runs on every route change since this is a
// single-page app — without this, `.reveal` elements on any page visited
// after the first stay permanently invisible (their default CSS state).
function useScrollReveal() {
  const location = useLocation();

  useEffect(() => {
    // Small delay lets the new page's DOM paint before we scan for targets
    const timer = setTimeout(() => {
      const elements = document.querySelectorAll('.reveal:not(.visible)');
      if (elements.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
      );

      elements.forEach((el) => observer.observe(el));

      // Anything already in the viewport on load won't fire an
      // intersection event until scrolled — force-check those now.
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const inView = rect.top < window.innerHeight && rect.bottom > 0;
        if (inView) el.classList.add('visible');
      });

      return () => observer.disconnect();
    }, 50);

    return () => clearTimeout(timer);
  }, [location.pathname]);
}

function AppShell() {
  useScrollReveal();

  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/studio" element={<CodeStudio />} />
        {/* Legacy /visualizer redirect to studio */}
        <Route path="/visualizer" element={<CodeStudio />} />
        <Route path="/review" element={<AIReview />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 'var(--space-4)', fontFamily: 'var(--font-display)' }}>
            <span style={{ fontFamily: 'var(--font-code)', color: 'var(--text-muted)', fontSize: '4rem', fontWeight: 700 }}>404</span>
            <span style={{ color: 'var(--text-secondary)' }}>This page doesn't exist.</span>
            <a href="/" style={{ color: 'var(--accent)', fontFamily: 'var(--font-code)', fontSize: 'var(--text-sm)' }}>← Back to CodeLens</a>
          </div>
        } />
      </Routes>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <AppShell />
      </div>
    </BrowserRouter>
  );
}
