"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import {
  isUnlocked,
  needsCeremony,
  monthsAgoToday,
  formatMonthsAgo,
  type Confession,
} from "@/lib/confessions";
import PasscodeGate from "@/components/PasscodeGate";
import LockedCard from "@/components/LockedCard";
import SealedReadyCard from "@/components/SealedReadyCard";
import UnlockedCard from "@/components/UnlockedCard";

type Filter = "all" | "unread" | "sealed";

function Mailbox({ lock }: { lock: () => void }) {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfessions = async () => {
      setLoading(true);
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

  const handleUpdate = (id: string, patch: Partial<Confession>) => {
    setConfessions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const filtered = confessions.filter((c) => {
    if (filter === "unread") return !c.is_read && isUnlocked(c);
    if (filter === "sealed") return !isUnlocked(c) || needsCeremony(c);
    return true;
  });

  const unreadCount = confessions.filter((c) => !c.is_read && isUnlocked(c)).length;
  const sealedCount = confessions.filter((c) => !isUnlocked(c) || needsCeremony(c)).length;

  // "On this day" — an unlocked letter written on this day-of-month, months ago.
  const onThisDay = confessions
    .filter((c) => isUnlocked(c) && !needsCeremony(c))
    .map((c) => ({ confession: c, months: monthsAgoToday(c) }))
    .filter((entry): entry is { confession: Confession; months: number } => entry.months !== null)
    .sort((a, b) => b.months - a.months)[0];

  const jumpTo = (id: string) => {
    document.getElementById(`letter-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 2600);
  };

  return (
    <main style={{ minHeight: "100vh", padding: "clamp(3rem, 7vh, 4.5rem) 1.25rem 7rem" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: "2.5rem" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <p className="tw">Registered mail · addressee only</p>
            <button
              type="button"
              onClick={lock}
              className="tw"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.55rem",
                borderBottom: "1px solid var(--line)",
                paddingBottom: 2,
              }}
            >
              Lock the box
            </button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.9rem",
              flexWrap: "wrap",
              marginBottom: "0.6rem",
            }}
          >
            <h1
              style={{
                fontFamily: "var(--serif)",
                fontWeight: 300,
                fontSize: "clamp(2rem, 5vw, 2.9rem)",
                color: "var(--ink-strong)",
                lineHeight: 1.1,
              }}
            >
              Letters for <em style={{ fontWeight: 400 }}>{config.readerName}</em>
            </h1>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="stamp-red"
                style={{ transform: "rotate(-3deg)" }}
              >
                {unreadCount} new
              </motion.span>
            )}
          </div>
          <p className="tw" style={{ fontSize: "0.58rem" }}>
            {confessions.length} {confessions.length === 1 ? "letter" : "letters"} · {sealedCount}{" "}
            sealed · {unreadCount} unread
          </p>
        </motion.header>

        {/* On this day */}
        {onThisDay && (
          <motion.button
            type="button"
            className="otd"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => jumpTo(onThisDay.confession.id)}
            style={{ marginBottom: "1.6rem" }}
          >
            <span
              className="tw"
              style={{ display: "block", color: "var(--post-blue)", marginBottom: "0.45rem" }}
            >
              ✦ On this day · {formatMonthsAgo(onThisDay.months)} ago
            </span>
            <span
              style={{
                fontFamily: "var(--serif)",
                fontStyle: "italic",
                fontSize: "0.92rem",
                color: "var(--ink-soft)",
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              &ldquo;{onThisDay.confession.text.slice(0, 110)}&rdquo;
            </span>
          </motion.button>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{ display: "flex", gap: "0.5rem", marginBottom: "2.4rem" }}
        >
          {(["all", "unread", "sealed"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`chip${filter === f ? " active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </motion.div>

        {/* Letters */}
        {loading ? (
          <motion.p
            animate={{ opacity: [0.35, 0.8, 0.35] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              color: "var(--ink-faint)",
              textAlign: "center",
              paddingTop: "4rem",
            }}
          >
            sorting the post…
          </motion.p>
        ) : loadError ? (
          <p
            style={{
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              color: "var(--wax)",
              textAlign: "center",
              paddingTop: "4rem",
            }}
          >
            The mailbox couldn&rsquo;t be opened — check the Supabase setup.
          </p>
        ) : filtered.length === 0 ? (
          <p
            style={{
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              color: "var(--ink-faint)",
              textAlign: "center",
              paddingTop: "4rem",
            }}
          >
            {filter === "unread"
              ? "Nothing new to read."
              : filter === "sealed"
                ? "No sealed letters waiting."
                : "The mailbox is empty — for now."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            <AnimatePresence>
              {filtered.map((c) => (
                <div
                  key={c.id}
                  id={`letter-${c.id}`}
                  className={highlightId === c.id ? "card-highlight" : undefined}
                >
                  {!isUnlocked(c) ? (
                    <LockedCard confession={c} />
                  ) : needsCeremony(c) ? (
                    <SealedReadyCard confession={c} onUpdate={handleUpdate} />
                  ) : (
                    <UnlockedCard confession={c} onUpdate={handleUpdate} />
                  )}
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <PasscodeGate
      title="The mailbox"
      subtitle={`These letters are addressed to ${config.readerName} only.`}
      password={config.readerPassword}
      storageKey="confession-post-mailbox-auth"
      postmark={{ ring: "REGISTERED MAIL · ADDRESSEE ONLY · PRIVATE ·", line1: "P.O.", line2: "BOX 2" }}
      buttonLabel="Unlock the box"
    >
      {(lock) => <Mailbox lock={lock} />}
    </PasscodeGate>
  );
}
