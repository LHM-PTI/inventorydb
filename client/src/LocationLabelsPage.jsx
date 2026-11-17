import { useEffect, useRef, useState } from "react";
import AssetLabelCard from "./AssetLabelCard.jsx";
import { apiFetch } from "./api.js";

export default function LocationLabelsPage({ onBack }) {
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [location, setLocation] = useState("");
  const [items, setItems] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [readyToPrint, setReadyToPrint] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const canPrint = Boolean(categoryId && location);

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
    if (!readyToPrint) return undefined;
    let cancelled = false;

    async function printLabels() {
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      if (cancelled) return;
      const images = [...document.querySelectorAll(".sticker-sheet img")];
      await Promise.all(
        images.map((img) =>
          typeof img.decode === "function"
            ? img.decode().catch(() => {})
            : Promise.resolve()
        )
      );
      if (cancelled) return;
      window.print();
      setReadyToPrint(false);
    }

    printLabels();
    return () => {
      cancelled = true;
    };
  }, [readyToPrint]);

  function clearLabels() {
    requestId.current += 1;
    setItems(null);
    setReadyToPrint(false);
    setPrinting(false);
  }

  async function printLocationLabels() {
    if (!categoryId || !location) return;

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setPrinting(true);
    setReadyToPrint(false);
    setError(null);
    setItems(null);

    try {
      const params = new URLSearchParams({ categoryId, location });
      const response = await apiFetch(`/api/inventory?${params}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load assets");
      }
      if (requestId.current !== currentRequest) return;
      setItems(data);
      if (data.length === 0) {
        setError("No assets found for that inventory and location.");
        return;
      }
      setReadyToPrint(true);
    } catch (err) {
      if (requestId.current !== currentRequest) return;
      setError(err.message || "Failed to load assets");
    } finally {
      if (requestId.current === currentRequest) {
        setPrinting(false);
      }
    }
  }

  return (
    <div className="app location-labels-page">
      <header className="header no-print">
        <button type="button" className="secondary back-button" onClick={onBack}>
          ← Reports
        </button>
        <h1>Print Location Labels</h1>
      </header>

      {error && <div className="banner error no-print">{error}</div>}

      <section className="panel no-print">
        <h2>Find &amp; filter</h2>
        <form
          className="filter-form"
          onSubmit={(event) => event.preventDefault()}
        >
          <label>
            Inventory
            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                clearLabels();
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
          <label>
            Location
            <select
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
                clearLabels();
              }}
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
            <button
              type="button"
              onClick={printLocationLabels}
              disabled={!canPrint || printing}
            >
              {printing ? "Preparing labels…" : "Print Location Labels"}
            </button>
          </div>
        </form>
        {!canPrint && (
          <p className="muted">
            Choose an inventory and a location before printing.
          </p>
        )}
      </section>

      {items && items.length > 0 && (
        <div className="sticker-sheet">
          {items.map((item) => (
            <AssetLabelCard
              key={item.id}
              id={item.id}
              categoryId={categoryId}
              assetId={item.assetId}
              type={item.type}
            />
          ))}
        </div>
      )}
    </div>
  );
}
