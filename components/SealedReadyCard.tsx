"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import { formatLongDate, type Confession } from "@/lib/confessions";

/**
 * A sealed letter whose day has arrived. Shows a pulsing wax seal;
 * clicking it plays the unseal ceremony, records `opened_at`, then the
 * parent swaps in the readable letter.
 */
export default function SealedReadyCard({
  confession,
  onUpdate,
}: {
  confession: Confession;
  onUpdate: (id: string, patch: Partial<Confession>) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reveal = () => {
    onUpdate(confession.id, { opened_at: new Date().toISOString() });
  };

  const handleOpen = async () => {
    if (opening || saving) return;
    setSaving(true);
    setError(null);
    const openedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("confessions")
      .update({ opened_at: openedAt })
      .eq("id", confession.id);

    if (updateError) {
      setSaving(false);
      setError("The seal would not open. Please try again.");
      return;
    }

    if (shouldReduceMotion) {
      onUpdate(confession.id, { opened_at: openedAt });
      return;
    }
    setSaving(false);
    setOpening(true);
  };

  return (
    <motion.div
      className="envelope"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 0.61, 0.21, 1] }}
      style={{ perspective: 700 }}
    >
      {/* Flap lifts during the ceremony */}
      <motion.div
        className="flap"
        aria-hidden="true"
        animate={opening ? { rotateX: 165, opacity: 0.35 } : {}}
        transition={{ duration: 0.55, delay: 0.45, ease: "easeIn" }}
        style={{ transformOrigin: "top center" }}
      />

      {/* The wax seal — cracks and falls when pressed */}
      <motion.div
        animate={
          opening
            ? { scale: [1, 1.14, 1], rotate: [0, -7, 10], y: [0, 0, 54], opacity: [1, 1, 0] }
            : {}
        }
        transition={{ duration: 0.75, times: [0, 0.4, 1], ease: "easeIn" }}
        onAnimationComplete={() => {
          if (opening) reveal();
        }}
        style={{
          position: "absolute",
          top: 62,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
        }}
      >
        <button
          type="button"
          className="waxseal waxseal--ready"
          onClick={handleOpen}
          disabled={opening || saving}
          aria-label="Break the seal and open this letter"
          style={{ border: "none" }}
        >
          {config.readerInitial}
        </button>
      </motion.div>

      <motion.div
        animate={opening ? { opacity: 0.25 } : {}}
        style={{ position: "relative", zIndex: 1, marginTop: "1.6rem" }}
      >
        <p className="tw" style={{ marginBottom: "0.5rem" }}>
          Sealed until
        </p>
        <p
          style={{
            fontFamily: "var(--serif)",
            fontSize: "1.15rem",
            color: "var(--ink)",
            marginBottom: "1.2rem",
          }}
        >
          {formatLongDate(confession.unlock_date!)}
        </p>

        <span className="stamp-red" style={{ transform: "rotate(-2deg)" }}>
          {opening || saving ? "Opening…" : "The day has come — break the seal"}
        </span>

        {error && (
          <p
            role="alert"
            style={{
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              fontSize: "0.82rem",
              color: "var(--wax)",
              marginTop: "0.9rem",
            }}
          >
            {error}
          </p>
        )}

        <p className="tw" style={{ fontSize: "0.55rem", marginTop: "1.5rem", opacity: 0.75 }}>
          Posted{" "}
          {new Date(confession.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </motion.div>
    </motion.div>
  );
}
