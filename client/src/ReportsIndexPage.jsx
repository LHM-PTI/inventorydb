export default function ReportsIndexPage({ onBack }) {
  return (
    <div className="app">
      <header className="header">
        <button type="button" className="secondary back-button" onClick={onBack}>
          ← Home
        </button>
        <h1>Reports</h1>
        <p>Choose a report.</p>
      </header>

      <nav className="home-nav" aria-label="Reports">
        <button
          type="button"
          onClick={() => {
            window.location.hash = "#/reports/csv";
          }}
        >
          CSV Download
        </button>
      </nav>
    </div>
  );
}
