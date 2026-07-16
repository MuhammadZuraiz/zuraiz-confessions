"use client";

import { MOODS, type ConfessionMood } from "@/lib/moods";

export default function MoodPicker({ value, onChange, disabled }: {
  value: ConfessionMood;
  onChange: (value: ConfessionMood) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mood-picker" role="radiogroup" aria-label="Letter mood">
      {MOODS.map((mood) => (
        <button
          key={mood.id}
          type="button"
          role="radio"
          aria-checked={value === mood.id}
          className={`mood-option mood-option--${mood.id}${value === mood.id ? " active" : ""}`}
          onClick={() => onChange(mood.id)}
          disabled={disabled}
        >
          <strong>{mood.label}</strong>
          <span>{mood.description}</span>
        </button>
      ))}
    </div>
  );
}
