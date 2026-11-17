import { QRCodeSVG } from "qrcode.react";

export default function AssetLabelCard({ id, categoryId, assetId, type }) {
  const assetUrl = `${window.location.origin}${window.location.pathname}#/inventory/${categoryId}/${id}`;

  return (
    <section className="sticker-card panel" aria-label={`Asset label ${assetId}`}>
      <div className="sticker-logo">
        <img src="/lhm-pti-logo.png" alt="LHM Physical Therapy Institute" />
      </div>
      <div className="sticker-meta">
        <div className="sticker-asset-id">{assetId}</div>
        {type ? <div className="sticker-type">{type}</div> : null}
      </div>
      <div className="sticker-qr">
        <QRCodeSVG value={assetUrl} size={160} level="M" />
      </div>
    </section>
  );
}
