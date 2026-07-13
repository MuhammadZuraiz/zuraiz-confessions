"use client";

import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Postmark from "@/components/Postmark";
import { getConfessionImages, type Confession } from "@/lib/confessions";

export default function UnlockedCard({
  confession,
  onMarkRead,
}: {
  confession: Confession;
  onMarkRead: (id: string) => void;
}) {
  const imageUrls = getConfessionImages(confession);
  const posted = new Date(confession.created_at);

  const handleMarkRead = async () => {
    await supabase.from("confessions").update({ is_read: true }).eq("id", confession.id);
    onMarkRead(confession.id);
  };

  return (
    <motion.div
      className="sheet"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 0.61, 0.21, 1] }}
      style={{
        padding: "clamp(1.6rem, 4vw, 2.4rem)",
        borderColor: confession.is_read ? "rgba(42,51,80,0.09)" : "rgba(167,47,34,0.3)",
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
          marginBottom: imageUrls.length > 0 ? "1.6rem" : "1.4rem",
          paddingRight: 56,
        }}
      >
        {confession.text}
      </p>

      {imageUrls.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              imageUrls.length === 1 ? "1fr" : "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "1rem",
            marginBottom: "1.4rem",
            padding: "0.3rem 0.2rem",
          }}
        >
          {imageUrls.map((imageUrl, index) => (
            <div
              key={imageUrl}
              className="snapshot"
              style={{ transform: `rotate(${index % 2 === 0 ? -1.2 : 1.4}deg)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={imageUrls.length === 1 ? "Enclosed photo" : `Enclosed photo ${index + 1}`}
                style={imageUrls.length === 1 ? { height: "auto", maxHeight: 360 } : { height: 150 }}
              />
            </div>
          ))}
        </div>
      )}

      {!confession.is_read && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <motion.button
            type="button"
            className="btn-ghost"
            onClick={handleMarkRead}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Mark as read ✓
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
