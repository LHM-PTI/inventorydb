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

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatText(value) {
  const text = typeof value === "string" ? value.trim() : value;
  if (text == null || text === "") return "—";
  return String(text);
}

function isCheckInStale(value) {
  if (!value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);
  return date < cutoff;
}

function financeRowClass(item) {
  if (item.status?.trim() === "Out of Service") return "out-of-service";
  if (isCheckInStale(item.lastCheckIn)) return "checkin-overdue";
  return undefined;
}

function locationLabel(shortcode, locations) {
  if (!shortcode) return "No location";
  const match = locations.find((row) => row.shortcode === shortcode);
  if (match?.name) return `${match.shortcode} — ${match.name}`;
  return shortcode;
}

function groupByLocation(items, locations) {
  const groups = new Map();
  for (const item of items) {
    const key = item.location?.trim() || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const order = new Map(locations.map((row, index) => [row.shortcode, index]));
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (!a) return 1;
      if (!b) return -1;
      const aIndex = order.has(a) ? order.get(a) : Number.MAX_SAFE_INTEGER;
      const bIndex = order.has(b) ? order.get(b) : Number.MAX_SAFE_INTEGER;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.localeCompare(b);
    })
    .map(([key, rows]) => ({
      key: key || "none",
      label: locationLabel(key, locations),
      items: [...rows].sort((a, b) => {
        const make = (a.manufacturer ?? "").localeCompare(b.manufacturer ?? "", undefined, {
          sensitivity: "base",
        });
        if (make !== 0) return make;
        const model = (a.type ?? "").localeCompare(b.type ?? "", undefined, {
          sensitivity: "base",
        });
        if (model !== 0) return model;
        return (a.assetId ?? "").localeCompare(b.assetId ?? "", undefined, {
          sensitivity: "base",
        });
      }),
    }));
}

export default function FinanceReportPage({ onBack }) {
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [groups, setGroups] = useState(null);
  const [reportSubtitle, setReportSubtitle] = useState(null);
  const [generating, setGenerating] = useState(false);
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

  async function generateReport(event) {
    event.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryId) params.set("categoryId", categoryId);
      const query = params.toString();
      const response = await apiFetch(
        `/api/reports/finance${query ? `?${query}` : ""}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load finance report");
      }
      const inventoryName =
        categories.find((category) => String(category.id) === String(categoryId))
          ?.category || "All categories";
      setReportSubtitle(`${inventoryName} - ${new Date().toLocaleString()}`);
      setGroups(groupByLocation(data, locations));
    } catch (err) {
      setGroups(null);
      setReportSubtitle(null);
      setError(err.message || "Failed to load finance report");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="app finance-report">
      <header className="header">
        <button
          type="button"
          className="secondary back-button no-print"
          onClick={onBack}
        >
          ← Reports
        </button>
        <h1>Finance Report</h1>
        {reportSubtitle && (
          <p className="finance-report-subtitle print-only">{reportSubtitle}</p>
        )}
      </header>

      {error && <div className="banner error no-print">{error}</div>}

      <section className="panel no-print">
        <h2>Find &amp; filter</h2>
        <form className="filter-form" onSubmit={generateReport}>
          <label>
            Inventory
            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setGroups(null);
                setReportSubtitle(null);
              }}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.category}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-actions">
            <button type="submit" disabled={generating}>
              {generating ? "Generating…" : "Generate"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => window.print()}
              disabled={generating || !groups?.length}
            >
              Print
            </button>
          </div>
        </form>
      </section>

      {groups && groups.length === 0 && (
        <section className="panel">
          <p className="muted">No assets found for that inventory.</p>
        </section>
      )}

      {groups?.map((group) => (
        <section className="panel" key={group.key}>
          <h2>{group.label}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Make</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Issued Date</th>
                  <th>Issued To</th>
                  <th>Check In Date</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.id} className={financeRowClass(item)}>
                    <td>{item.assetId}</td>
                    <td>{formatText(item.manufacturer)}</td>
                    <td>{formatText(item.type)}</td>
                    <td>{formatText(item.status)}</td>
                    <td>{formatDate(item.issued)}</td>
                    <td>{formatIssuedTo(item.lastName, item.firstName)}</td>
                    <td>{formatDate(item.lastCheckIn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
