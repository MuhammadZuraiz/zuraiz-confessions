"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Postmark from "@/components/Postmark";
import Lightbox from "@/components/Lightbox";
import ReactionSeals from "@/components/ReactionSeals";
import { getStationery } from "@/lib/stationery";
import { getConfessionImages, type Confession } from "@/lib/confessions";

export default function UnlockedCard({
  confession,
  onUpdate,
}: {
  confession: Confession;
  onUpdate: (id: string, patch: Partial<Confession>) => void;
}) {
  const imageUrls = getConfessionImages(confession);
  const posted = new Date(confession.created_at);
  const stationery = getStationery(confession.stationery);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [savingReaction, setSavingReaction] = useState(false);
  const [savingRead, setSavingRead] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleMarkRead = async () => {
    if (savingRead) return;
    setSavingRead(true);
    setActionError(null);
    const { error } = await supabase
      .from("confessions")
      .update({ is_read: true })
      .eq("id", confession.id);
    if (error) {
      setActionError("That mark did not stick. Please try again.");
    } else {
      onUpdate(confession.id, { is_read: true });
    }
    setSavingRead(false);
  };

  const handleReaction = async (slug: string) => {
    if (savingReaction) return;
    setSavingReaction(true);
    setActionError(null);
    const patch = {
      reaction: slug,
      reacted_at: new Date().toISOString(),
      is_read: true,
    };
    const { error } = await supabase.from("confessions").update(patch).eq("id", confession.id);
    if (error) {
      setActionError("Her seal could not be saved. Please try again.");
    } else {
      onUpdate(confession.id, patch);
    }
    setSavingReaction(false);
  };

  return (
    <motion.div
      className={`sheet ${stationery.className}`.trim()}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 0.61, 0.21, 1] }}
      style={{
        padding: "clamp(1.6rem, 4vw, 2.4rem)",
        ...(confession.is_read ? {} : { borderColor: "rgba(167,47,34,0.35)" }),
      }}
    >
      {/* NEW stamp */}
      {!confession.is_read && (
        <motion.span
          className="stamp-red"
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.25 }}
          style={{
            position: "absolute",
            top: -12,
            right: 22,
            transform: "rotate(-6deg)",
          }}
        >
          New
        </motion.span>
      )}

      {/* Date postmark */}
      <Postmark
        size={72}
        ring="THE CONFESSION POST · RECEIVED WITH LOVE ·"
        line1={posted
          .toLocaleDateString("en-US", { month: "short", day: "numeric" })
          .toUpperCase()}
        line2={String(posted.getFullYear())}
        style={{
          position: "absolute",
          top: 16,
          right: 18,
          color: "var(--post-blue)",
          opacity: 0.5,
          transform: "rotate(9deg)",
        }}
      />

      <p className="tw" style={{ marginBottom: "1.4rem" }}>
        {posted.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        {confession.unlock_date && (
          <span style={{ color: "var(--wax)", marginLeft: "0.8rem" }}>· was sealed for you</span>
        )}
      </p>

      <p
        style={{
          fontFamily: "var(--serif)",
          fontStyle: "italic",
          fontSize: "clamp(1rem, 2.2vw, 1.12rem)",
          lineHeight: 1.9,
          color: "var(--ink)",
          whiteSpace: "pre-wrap",
          marginBottom: "1.6rem",
          paddingRight: 56,
        }}
      >
        {confession.text}
      </p>

      {confession.audio_url && (
        <div style={{ marginBottom: "1.6rem" }}>
          <span className="tw" style={{ display: "block", fontSize: "0.55rem", marginBottom: "0.5rem" }}>
            His voice ♫
          </span>
          <audio className="voice" controls src={confession.audio_url} preload="metadata" />
        </div>
      )}

      {imageUrls.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              imageUrls.length === 1 ? "1fr" : "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "1rem",
            marginBottom: "1.6rem",
            padding: "0.3rem 0.2rem",
          }}
        >
          {imageUrls.map((imageUrl, index) => (
            <button
              key={imageUrl}
              type="button"
              className="snapshot"
              onClick={() => setLightboxIndex(index)}
              aria-label={`View photo ${index + 1} full size`}
              style={{ transform: `rotate(${index % 2 === 0 ? -1.2 : 1.4}deg)`, cursor: "zoom-in" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={imageUrls.length === 1 ? "Enclosed photo" : `Enclosed photo ${index + 1}`}
                style={imageUrls.length === 1 ? { height: "auto", maxHeight: 360 } : { height: 150 }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Reactions + mark as read */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          borderTop: "1px solid var(--rule)",
          paddingTop: "1.2rem",
        }}
      >
        <ReactionSeals
          value={confession.reaction}
          onSelect={handleReaction}
          disabled={savingReaction}
        />
        {!confession.is_read && (
          <motion.button
            type="button"
            className="btn-ghost"
            onClick={handleMarkRead}
            disabled={savingRead}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {savingRead ? "Marking…" : "Mark as read ✓"}
          </motion.button>
        )}
      </div>

      {actionError && (
        <p
          role="alert"
          style={{
            marginTop: "0.8rem",
            fontFamily: "var(--serif)",
            fontStyle: "italic",
            fontSize: "0.82rem",
            color: "var(--wax)",
          }}
        >
          {actionError}
        </p>
      )}

      <Lightbox
        images={imageUrls}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </motion.div>
  );
}
