import { useEffect, useState } from "react";
import { apiFetch } from "./api.js";

function formatIssuedTo(lastName, firstName) {
  const last = lastName?.trim() ?? "";
  const first = firstName?.trim() ?? "";
  if (!last && !first) return "—";
  if (!first) return last;
  if (!last) return first;
  return `${last}, ${first}`;
}

function formatCheckInAge(value) {
  if (!value) return "Never";
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return "Never";

  const now = new Date();
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    months = 0;
    days = 0;
  }

  const parts = [];
  if (months > 0) {
    parts.push(`${months} month${months === 1 ? "" : "s"}`);
  }
  if (days > 0) {
    parts.push(`${days} day${days === 1 ? "" : "s"}`);
  }
  return parts.length > 0 ? parts.join(", ") : "0 days";
}

export default function CheckInAgingReportPage({ onBack }) {
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [location, setLocation] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (categoryId) params.set("categoryId", categoryId);
        if (location) params.set("location", location);
        const query = params.toString();
        const response = await apiFetch(
          `/api/reports/check-in-aging${query ? `?${query}` : ""}`
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load report");
        }
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setError(err.message || "Failed to load report");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReport();
    return () => {
      cancelled = true;
    };
  }, [categoryId, location]);

  return (
    <div className="app">
      <header className="header">
        <button type="button" className="secondary back-button" onClick={onBack}>
          ← Reports
        </button>
        <h1>Check In Aging Report</h1>
        <p>Assets that have not been checked in for more than 3 months.</p>
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
        </form>
      </section>

      <section className="panel">
        {loading ? (
          <p className="muted">Loading report…</p>
        ) : items.length === 0 ? (
          <p className="muted">No assets are overdue for check-in.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Model</th>
                  <th>Location</th>
                  <th>Issued To</th>
                  <th>Months/Days Since Last Check-In</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.categoryId ? (
                        <a
                          className="asset-id-button"
                          href={`#/inventory/${item.categoryId}/${item.id}`}
                        >
                          {item.assetId}
                        </a>
                      ) : (
                        item.assetId
                      )}
                    </td>
                    <td>{item.type || "—"}</td>
                    <td>{item.location || "—"}</td>
                    <td>{formatIssuedTo(item.lastName, item.firstName)}</td>
                    <td>{formatCheckInAge(item.lastCheckIn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
