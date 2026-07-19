"use client";

import { motion, useReducedMotion } from "framer-motion";
import { config } from "@/lib/config";
import { daysUntil, formatLongDate, type Confession } from "@/lib/confessions";
import { getMood } from "@/lib/moods";

export default function LockedCard({ confession }: { confession: Confession }) {
  const shouldReduceMotion = useReducedMotion();
  const days = daysUntil(confession.unlock_date!);
  const mood = getMood(confession.mood);

  return (
    <motion.div
      className={`envelope envelope--${confession.mood}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 0.61, 0.21, 1] }}
    >
      <div className="flap" aria-hidden="true" />

      {/* Wax seal on the flap point */}
      <motion.div
        animate={shouldReduceMotion ? {} : { y: [0, -3, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: 62,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
        }}
      >
        <div className="waxseal">{config.readerInitial}</div>
      </motion.div>

      <div style={{ position: "relative", zIndex: 1, marginTop: "1.6rem" }}>
        <span className={`mood-stamp mood-stamp--${confession.mood}`} style={{ marginBottom: ".75rem" }}>
          {mood.label}
        </span>
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
          {days === 1 ? "Opens tomorrow" : `${days} days to go`}
        </span>

        {confession.mood === "spicy" && (
          <p style={{ marginTop: ".9rem", fontSize: ".82rem", fontStyle: "italic", opacity: .7 }}>
            A private sleeve waits inside.
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
      </div>
    </motion.div>
  );
}
