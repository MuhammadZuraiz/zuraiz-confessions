"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Lightbox from "@/components/Lightbox";
import Postmark from "@/components/Postmark";
import ReactionSeals from "@/components/ReactionSeals";
import { getConfessionImages, isSpicy, type Confession } from "@/lib/confessions";
import { getMood } from "@/lib/moods";
import { privateJson } from "@/lib/private-api";
import { getStationery } from "@/lib/stationery";

export default function UnlockedCard({ confession, onUpdate, onCover }: {
  confession: Confession;
  onUpdate: (id: string, patch: Partial<Confession>) => void;
  onCover?: () => void;
}) {
  const images = getConfessionImages(confession);
  const stationery = getStationery(confession.stationery);
  const mood = getMood(confession.mood);
  const posted = new Date(confession.created_at);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const action = async (body: { action: string; reaction?: string }, patch: Partial<Confession>) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await privateJson(`/api/confessions/${confession.id}`, { method: "PATCH", body: JSON.stringify(body) });
      onUpdate(confession.id, patch);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That mark did not stick.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.article className={`sheet ${stationery.className} opened-letter opened-letter--${confession.mood}`.trim()} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {!confession.is_read && <span className="stamp-red letter-new">New</span>}
      <Postmark size={72} ring="THE CONFESSION POST · RECEIVED WITH LOVE ·"
        line1={posted.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()} line2={String(posted.getFullYear())}
        style={{ position: "absolute", top: 16, right: 18, color: confession.mood === "spicy" ? "#b36b78" : "var(--post-blue)", opacity: 0.48, transform: "rotate(9deg)" }} />
      <div className="letter-meta"><span className={`mood-stamp mood-stamp--${confession.mood}`}>{mood.label}</span><span>{posted.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></div>
      <p className="opened-letter__text">{confession.text}</p>

      {confession.audio_url && <div className="letter-audio"><span className="tw">His voice ♫</span><audio className="voice" controls src={confession.audio_url} preload="metadata" /></div>}
      {confession.video_url && <div className="letter-video"><span className="tw">His film ✦</span>
        <video className="film" controls playsInline preload="metadata" src={confession.video_url} /></div>}
      {images.length > 0 && <div className="letter-photos">{images.map((url, index) => <button key={url} type="button" className="snapshot" onClick={() => setLightbox(index)} aria-label={`View photo ${index + 1}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`Enclosed photo ${index + 1}`} />
      </button>)}</div>}

      <div className="letter-actions">
        <ReactionSeals value={confession.reaction} onSelect={(reaction) => action({ action: "reaction", reaction }, { reaction, reacted_at: new Date().toISOString(), is_read: true })} disabled={saving} />
        <div className="letter-actions__buttons">
          {!confession.is_read && <button type="button" className="btn-ghost" onClick={() => action({ action: "mark-read" }, { is_read: true })} disabled={saving}>{saving ? "Marking…" : "Mark as read ✓"}</button>}
          {isSpicy(confession) && onCover && <button type="button" className="btn-private" onClick={onCover}>Cover</button>}
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Lightbox images={images} index={lightbox} onClose={() => setLightbox(null)} onNavigate={setLightbox} />
    </motion.article>
  );
}
