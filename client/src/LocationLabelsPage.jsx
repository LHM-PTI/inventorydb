import { useEffect, useState } from "react";
import { apiFetch } from "./api.js";

export default function LocationLabelsPage({ onBack }) {
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFilters() {
      try {
        const [categoriesResponse, locationsResponse] = await Promise.all([
          apiFetch("/api/categories"),
          apiFetch("/api/locations"),
        ]);
        const categoriesData = await categoriesResponse.json();
        const locationsData = await locationsResponse.json();
        if (!categoriesResponse.ok) {
          throw new Error(categoriesData.error || "Failed to load categories");
        }
        if (!locationsResponse.ok) {
          throw new Error(locationsData.error || "Failed to load locations");
        }
        if (!cancelled) {
          setCategories(categoriesData);
          setLocations(locationsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load report filters");
        }
      }
    }

    loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app">
      <header className="header">
        <button type="button" className="secondary back-button" onClick={onBack}>
          ← Reports
        </button>
        <h1>Print Location Labels</h1>
      </header>

      {error && <div className="banner error">{error}</div>}

      <section className="panel">
        <h2>Find &amp; filter</h2>
        <form
          className="filter-form"
          onSubmit={(event) => event.preventDefault()}
        >
          <label>
            Inventory
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.category}
                </option>
              ))}
            </select>
          </label>
          <label>
            Location
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              <option value="">All locations</option>
              {locations.map((row) => (
                <option key={row.id} value={row.shortcode}>
                  {row.shortcode} — {row.name}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-actions">
            <button type="button">Print Location Labels</button>
          </div>
        </form>
      </section>
    </div>
  );
}
