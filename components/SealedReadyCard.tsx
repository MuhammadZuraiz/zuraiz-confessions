"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { config } from "@/lib/config";
import { formatLongDate, type Confession } from "@/lib/confessions";
import { privateJson } from "@/lib/private-api";

export default function SealedReadyCard({ confession, onUpdate }: {
  confession: Confession;
  onUpdate: (id: string, patch: Partial<Confession>) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openedContent, setOpenedContent] = useState<Partial<Confession> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    if (opening || saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await privateJson<{ patch: Partial<Confession>; confession?: Confession }>(`/api/confessions/${confession.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "open" }),
      });
      const next = result.confession ?? result.patch;
      setOpenedContent(next);
      if (reduceMotion) onUpdate(confession.id, next);
      else setOpening(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The seal would not open.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className={`envelope envelope--${confession.mood}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ perspective: 700 }}>
      <motion.div className="flap" aria-hidden="true" animate={opening ? { rotateX: 165, opacity: 0.35 } : {}} transition={{ duration: 0.55, delay: 0.45 }} style={{ transformOrigin: "top center" }} />
      <motion.div animate={opening ? { scale: [1, 1.14, 1], rotate: [0, -7, 10], y: [0, 0, 54], opacity: [1, 1, 0] } : {}}
        transition={{ duration: 0.75 }} onAnimationComplete={() => opening && onUpdate(confession.id, openedContent || { opened_at: new Date().toISOString() })}
        style={{ position: "absolute", top: 62, left: "50%", transform: "translateX(-50%)", zIndex: 2 }}>
        <button type="button" className="waxseal waxseal--ready" onClick={open} disabled={opening || saving} aria-label="Break the seal"><span>{config.readerInitial}</span></button>
      </motion.div>
      <div style={{ position: "relative", zIndex: 1, marginTop: "1.6rem" }}>
        <p className="tw">Sealed until</p><p className="sealed-date">{formatLongDate(confession.unlock_date!)}</p>
        <span className="stamp-red">{opening || saving ? "Opening…" : confession.mood === "spicy" ? "Break seal to reach private sleeve" : "The day has come — break the seal"}</span>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </motion.div>
  );
}
