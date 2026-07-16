"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Confession, SenderRole } from "@/lib/confessions";
import { getMood } from "@/lib/moods";
import { privateJson } from "@/lib/private-api";

export default function PrivateSleeve({ confession, role, onReveal, returnPost = false }: {
  confession: Confession;
  role: SenderRole;
  onReveal: (revealed: Confession) => void;
  returnPost?: boolean;
}) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mood = getMood(confession.mood);

  const reveal = async () => {
    if (opening) return;
    setOpening(true);
    setError(null);
    try {
      const result = await privateJson<{ confession: Confession }>(`/api/confessions/${confession.id}/reveal`, {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      onReveal(result.confession);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The private enclosure could not be opened.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <motion.article className={`private-sleeve private-sleeve--${confession.mood}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="private-sleeve__stamp tw">{returnPost ? "Return post" : mood.label}</div>
      <p className="tw private-sleeve__date">{new Date(confession.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      <div className="private-sleeve__inner">
        <span aria-hidden="true">{returnPost ? "↩" : "Q"}</span>
        <h2>{returnPost ? "A return note is waiting" : "Private enclosure"}</h2>
        <p>{confession.mood === "after-dark"
          ? "Contents concealed until you choose to open."
          : confession.image_count > 0 || confession.has_audio
            ? "Contains a private enclosure."
            : "Contents concealed until you choose to open."}</p>
        <button type="button" className="btn-private" onClick={reveal} disabled={opening}>
          {opening ? "Opening privately…" : returnPost ? "Open return post" : "Open privately"}
        </button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </motion.article>
  );
}
