"use client";

import { config, getReaction } from "@/lib/config";

export default function ReactionSeals({
  value,
  onSelect,
  disabled,
}: {
  value: string | null | undefined;
  onSelect: (slug: string) => void;
  disabled?: boolean;
}) {
  const selected = getReaction(value);

  return (
    <div>
      <span className="tw" style={{ display: "block", fontSize: "0.55rem", marginBottom: "0.6rem" }}>
        Press your seal
      </span>
      <div className="reaction-row">
        {config.reactions.map((reaction) => (
          <button
            key={reaction.slug}
            type="button"
            className={`reaction-seal${value === reaction.slug ? " pressed" : ""}`}
            onClick={() => onSelect(reaction.slug)}
            disabled={disabled}
            aria-label={reaction.label}
            aria-pressed={value === reaction.slug}
            title={reaction.label}
          >
            <span aria-hidden="true">{reaction.glyph}</span>
          </button>
        ))}
        {selected && (
          <span
            style={{
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              fontSize: "0.82rem",
              color: "var(--wax)",
              marginLeft: "0.2rem",
            }}
          >
            {selected.label}
          </span>
        )}
      </div>
    </div>
  );
}
