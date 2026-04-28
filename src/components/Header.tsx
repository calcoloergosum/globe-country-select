type Page = "main" | "quiz";

type HeaderProps = {
  page: Page;
  onNavigate: (page: Page) => void;
};

export function Header({ page, onNavigate }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="site-brand">
        <span className="site-header-logo" aria-hidden="true">
          🌍
        </span>
        <div className="site-brand-copy">
          <span className="site-title">Atlas Studio</span>
          <span className="site-subtitle">Interactive Globe Experience</span>
        </div>
      </div>
      <nav className="site-nav">
        <button
          className={`nav-btn${page === "main" ? " active" : ""}`}
          aria-current={page === "main" ? "page" : undefined}
          onClick={() => onNavigate("main")}
        >
          Explore
        </button>
        <button
          className={`nav-btn${page === "quiz" ? " active" : ""}`}
          aria-current={page === "quiz" ? "page" : undefined}
          onClick={() => onNavigate("quiz")}
        >
          Quiz
        </button>
      </nav>
    </header>
  );
}
