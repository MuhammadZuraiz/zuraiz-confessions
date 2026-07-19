"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PasscodeGate from "@/components/PasscodeGate";
import { config, getReaction } from "@/lib/config";
import { isUnlocked, type Confession } from "@/lib/confessions";
import { getMood } from "@/lib/moods";
import { privateJson } from "@/lib/private-api";
import { getStationery } from "@/lib/stationery";

function date(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SentCard({ confession, index }: { confession: Confession; index: number }) {
  const mood = getMood(confession.mood);
  const stationery = getStationery(mood.defaultStationery);
  const reaction = getReaction(confession.reaction);
  const unlocked = isUnlocked(confession);

  return (
    <motion.article className={`sheet sent-card ${stationery.className} sent-card--${confession.mood}`.trim()}
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}>
      <div className="sent-card__topline"><p className="tw">Posted {date(confession.created_at)}</p><span className={`mood-stamp mood-stamp--${confession.mood}`}>{mood.label}</span></div>
      <div className="ledger-trail"><span className="ledger-status ledger-status--active">Delivered</span>
        {confession.unlock_date && !unlocked && <><span className="ledger-arrow">→</span><span className="ledger-status">Sealed until {date(`${confession.unlock_date}T00:00:00`)}</span></>}
        {confession.opened_at && <><span className="ledger-arrow">→</span><span className="ledger-status ledger-status--active">Opened {date(confession.opened_at)}</span></>}
        {confession.is_read && <><span className="ledger-arrow">→</span><span className="ledger-status ledger-status--active">Read ✓</span></>}
      </div>

      <div className="sent-content"><p className="sent-excerpt">&ldquo;{confession.text}&rdquo;</p>
        <p className="tw sent-card__contents">
          {confession.image_count ? `${confession.image_count} photo${confession.image_count === 1 ? "" : "s"}` : "letter"}
          {confession.has_audio ? " · voice note ♫" : ""}
          {confession.has_video ? " · film ✦" : ""}
        </p>
      </div>

      {reaction && <div className="ledger-reaction"><span className="ledger-reaction__seal">{reaction.glyph}</span><span><strong>She pressed her seal</strong><small>{reaction.label}{confession.reacted_at ? ` · ${date(confession.reacted_at)}` : ""}</small></span></div>}
    </motion.article>
  );
}

function SentLedger({ lock }: { lock: () => Promise<void> }) {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    privateJson<{ confessions: Confession[] }>("/api/confessions?view=sent")
      .then((result) => active && setConfessions(result.confessions))
      .catch((caught: Error) => active && setError(caught.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const opened = confessions.filter((item) => item.opened_at).length;
  const read = confessions.filter((item) => item.is_read).length;

  return (
    <main className="ledger-page"><div className="ledger-inner">
      <motion.header initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="ledger-header">
        <div className="ledger-nav"><Link href="/" className="tw ledger-link">← Writing desk</Link><button type="button" onClick={lock} className="tw ledger-link">Lock the ledger</button></div>
        <p className="tw">Private outgoing register · writer only</p><h1 className="ledger-title">Letters you sent to <em>{config.readerName}</em></h1>
        <p className="ledger-summary tw">{confessions.length} letters · {opened} opened · {read} read</p>
      </motion.header>
      {loading ? <p className="ledger-empty">checking the private dispatch book…</p>
        : error ? <p className="ledger-empty ledger-empty--error">{error}</p>
        : !confessions.length ? <p className="ledger-empty">No letters have left the writing desk yet.</p>
        : <div className="ledger-stack">{confessions.map((item, index) => <SentCard key={item.id} confession={item} index={index} />)}</div>}
    </div></main>
  );
}

export default function SentPage() {
  return <PasscodeGate role="writer" title="The dispatch ledger" subtitle={`A private record of ${config.writerName}'s letters to ${config.readerName}.`}
    postmark={{ ring: "OUTGOING MAIL · PRIVATE LEDGER · WRITER ONLY ·", line1: "SENT", line2: "WITH LOVE", color: "var(--post-blue)" }}
    buttonLabel="Open the ledger">
    {(lock) => <SentLedger lock={lock} />}
  </PasscodeGate>;
}
