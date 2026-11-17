import { useEffect, useState } from "react";
import AssetLabelCard from "./AssetLabelCard.jsx";
import { apiFetch } from "./api.js";

export default function AssetStickerPage({ id, categoryId }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadItem() {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch(`/api/inventory/${id}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load inventory item");
        }
        if (!cancelled) {
          setItem(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load inventory item");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadItem();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="app sticker-page">
      <header className="header sticker-header no-print">
        <h1>Asset Label</h1>
        <p>
          Sized for a Dymo LabelWriter 550 using a 1.125 × 3.5-inch label.
        </p>
        <div className="actions">
          <button type="button" onClick={() => window.print()}>
            Print
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              window.location.hash = `#/inventory/${categoryId}/${id}`;
            }}
          >
            Close
          </button>
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}

      {loading ? (
        <p className="muted">Loading sticker…</p>
      ) : item ? (
        <AssetLabelCard
          id={item.id}
          categoryId={categoryId}
          assetId={item.assetId}
          type={item.type}
        />
      ) : null}
    </div>
  );
}
