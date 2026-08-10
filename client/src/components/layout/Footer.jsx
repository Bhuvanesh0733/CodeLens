import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner container">
        <div className="footer__top">
          <div className="footer__brand">
            <div className="footer__logo">
              <span className="footer__logo-bracket">&lt;/&gt;</span>
              <span>CodeLens</span>
            </div>
            <p className="footer__tagline">
              Write code. See it run. Let AI catch what you missed.
            </p>
          </div>

          <div className="footer__links">
            <div className="footer__col">
              <span className="footer__col-title">Navigate</span>
              <Link to="/">Home</Link>
              <Link to="/visualizer">Visualizer</Link>
              <Link to="/review">AI Review</Link>
              <Link to="/history">History</Link>
            </div>
            <div className="footer__col">
              <span className="footer__col-title">Concepts</span>
              <span>Buffers</span>
              <span>Streams</span>
              <span>SSE</span>
              <span>EventEmitter</span>
            </div>
          </div>
        </div>

        <div className="footer__bottom">
          <div className="footer__mono">
            <span>Built with Node.js · React · Vite · Anthropic Claude</span>
          </div>
          <div className="footer__system">
            <span className="footer__sys-label">SYSTEM</span>
            <div className="footer__sys-nodes">
              <span>Browser</span>
              <span className="footer__arrow">→</span>
              <span>HTTP</span>
              <span className="footer__arrow">→</span>
              <span>Buffer</span>
              <span className="footer__arrow">→</span>
              <span>SSE</span>
              <span className="footer__arrow">→</span>
              <span>AI</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
