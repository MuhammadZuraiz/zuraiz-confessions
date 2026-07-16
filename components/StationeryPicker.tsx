"use client";

import { STATIONERY, type StationeryId } from "@/lib/stationery";

export default function StationeryPicker({
  value,
  onChange,
  disabled,
}: {
  value: StationeryId;
  onChange: (id: StationeryId) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
      {STATIONERY.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`swatch${value === s.id ? " selected" : ""}`}
          onClick={() => onChange(s.id)}
          disabled={disabled}
          aria-label={`${s.label} stationery`}
          aria-pressed={value === s.id}
          title={s.label}
          style={{
            background: `linear-gradient(135deg, ${s.paper} 62%, ${s.ink} 62%)`,
          }}
        />
      ))}
      <span className="field-hint tw" style={{ letterSpacing: "0.02em" }}>
        {STATIONERY.find((s) => s.id === value)?.label.toLowerCase()}
      </span>
    </div>
  );
}
