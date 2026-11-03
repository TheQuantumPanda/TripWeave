import { Moon, Sun, Github, RotateCcw } from "lucide-react";

interface TopBarProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  online: boolean | null;
  onReset: () => void;
  canReset: boolean;
}

export function TopBar({ theme, onToggleTheme, online, onReset, canReset }: TopBarProps) {
  const status = online === null ? "Checking API" : online ? "API online" : "API offline";
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a href="/" className="brand" aria-label="TripWeave home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 7h20M11 7v18M21 7v18M6 15c5-5 15 7 20 2M6 23c5-5 15 7 20 2" />
            </svg>
          </span>
          <span className="brand-name">TripWeave<span className="brand-dot">.</span></span>
        </a>
        <nav className="topbar-nav" aria-label="Main navigation">
          <a href="#planner">Plan a trip</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="topbar-actions">
          <span className="api-status" role="status" style={{ color: online === null ? "rgb(var(--text-low))" : online ? "rgb(var(--ok))" : "rgb(var(--danger))" }}>
            <span className="status-dot" />{status}
          </span>
          {canReset && (
            <button onClick={onReset} className="btn btn-ghost new-session" title="Clear the saved thread and start over">
              <RotateCcw size={14} /><span>New session</span>
            </button>
          )}
          <a href="https://github.com/ayushYadav1107/VoyaGen-AI-" target="_blank" rel="noreferrer noopener" aria-label="Original project source" className="icon-button source-link" title="Original project source"><Github size={17} /></a>
          <button onClick={onToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} className="icon-button">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
