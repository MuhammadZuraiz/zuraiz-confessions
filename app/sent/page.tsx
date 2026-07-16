"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { config, getReaction } from "@/lib/config";
import { getStationery } from "@/lib/stationery";
import {
  getConfessionImages,
  isUnlocked,
  type Confession,
} from "@/lib/confessions";
import PasscodeGate from "@/components/PasscodeGate";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSealDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusStep({ children, active = true }: { children: React.ReactNode; active?: boolean }) {
  return <span className={`ledger-status${active ? " ledger-status--active" : ""}`}>{children}</span>;
}

function SentCard({ confession, index }: { confession: Confession; index: number }) {
  const stationery = getStationery(confession.stationery);
  const reaction = getReaction(confession.reaction);
  const photos = getConfessionImages(confession).length;
  const unlocked = isUnlocked(confession);

  return (
    <motion.article
      className={`sheet sent-card ${stationery.className}`.trim()}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3) }}
    >
      <div className="sent-card__topline">
        <p className="tw">Posted {formatDate(confession.created_at)}</p>
        <span className="ledger-stationery">{stationery.label}</span>
      </div>

      <div className="ledger-trail" aria-label="Letter status">
        <StatusStep>Delivered</StatusStep>

        {confession.unlock_date && !unlocked && (
          <>
            <span className="ledger-arrow" aria-hidden="true">→</span>
            <StatusStep active={false}>Sealed until {formatSealDate(confession.unlock_date)}</StatusStep>
          </>
        )}

        {confession.unlock_date && unlocked && !confession.opened_at && (
          <>
            <span className="ledger-arrow" aria-hidden="true">→</span>
            <StatusStep active={false}>Waiting for her seal</StatusStep>
          </>
        )}

        {confession.opened_at && (
          <>
            <span className="ledger-arrow" aria-hidden="true">→</span>
            <StatusStep>Opened {formatDate(confession.opened_at)}</StatusStep>
          </>
        )}

        {confession.is_read && (
          <>
            <span className="ledger-arrow" aria-hidden="true">→</span>
            <StatusStep>Read ✓</StatusStep>
          </>
        )}
      </div>

      <p className="sent-excerpt">&ldquo;{confession.text}&rdquo;</p>

      <div className="sent-card__footer">
        <p className="tw sent-card__contents">
          {photos > 0 && `${photos} ${photos === 1 ? "photo" : "photos"}`}
          {photos > 0 && confession.audio_url && " · "}
          {confession.audio_url && "voice note ♫"}
          {photos === 0 && !confession.audio_url && "letter only"}
        </p>

        {reaction && (
          <div className="ledger-reaction">
            <span className="ledger-reaction__seal" aria-hidden="true">{reaction.glyph}</span>
            <span>
              <strong>She pressed her seal</strong>
              <small>
                {reaction.label}
                {confession.reacted_at ? ` · ${formatDate(confession.reacted_at)}` : ""}
              </small>
            </span>
          </div>
        )}
      </div>
    </motion.article>
  );
}

function SentLedger({ lock }: { lock: () => void }) {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchConfessions = async () => {
      const { data, error } = await supabase
        .from("confessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setConfessions(data);
      setLoadError(Boolean(error));
      setLoading(false);
    };
    fetchConfessions();
  }, []);

  const openedCount = confessions.filter((c) => Boolean(c.opened_at)).length;
  const readCount = confessions.filter((c) => c.is_read).length;
  const reactionCount = confessions.filter((c) => Boolean(c.reaction)).length;

  return (
    <main style={{ minHeight: "100vh", padding: "clamp(3rem, 7vh, 4.5rem) 1.25rem 7rem" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: "2.6rem" }}
        >
          <div className="ledger-nav">
            <Link href="/" className="tw ledger-link">← Writing desk</Link>
            <button type="button" onClick={lock} className="tw ledger-link">Lock the ledger</button>
          </div>

          <p className="tw" style={{ marginBottom: "0.9rem" }}>Private outgoing register · writer only</p>
          <h1 className="ledger-title">
            Letters you sent to <em>{config.readerName}</em>
          </h1>
          <p className="ledger-summary tw">
            {confessions.length} {confessions.length === 1 ? "letter" : "letters"} · {openedCount} opened · {readCount} read · {reactionCount} sealed reactions
          </p>
        </motion.header>

        {loading ? (
          <motion.p
            animate={{ opacity: [0.35, 0.8, 0.35] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="ledger-empty"
          >
            checking the dispatch book…
          </motion.p>
        ) : loadError ? (
          <p className="ledger-empty ledger-empty--error">
            The ledger could not be opened — check the Supabase upgrade and connection.
          </p>
        ) : confessions.length === 0 ? (
          <p className="ledger-empty">No letters have left the writing desk yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
            {confessions.map((confession, index) => (
              <SentCard key={confession.id} confession={confession} index={index} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function SentPage() {
  return (
    <PasscodeGate
      title="The dispatch ledger"
      subtitle={`A private record of ${config.writerName}'s letters to ${config.readerName}.`}
      password={config.writerPassword}
      storageKey="confession-post-sent-auth"
      postmark={{
        ring: "OUTGOING MAIL · PRIVATE LEDGER · WRITER ONLY ·",
        line1: "SENT",
        line2: "WITH LOVE",
        color: "var(--post-blue)",
      }}
      buttonLabel="Open the ledger"
    >
      {(lock) => <SentLedger lock={lock} />}
    </PasscodeGate>
  );
}
