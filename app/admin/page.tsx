"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import { isUnlocked, type Confession } from "@/lib/confessions";
import Postmark from "@/components/Postmark";
import LockedCard from "@/components/LockedCard";
import UnlockedCard from "@/components/UnlockedCard";

type Filter = "all" | "unread" | "sealed";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [wrongPassword, setWrongPassword] = useState(false);
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const handleLogin = () => {
    if (password === config.readerPassword) {
      setAuthed(true);
    } else {
      setWrongPassword(true);
      setTimeout(() => setWrongPassword(false), 2000);
    }
  };

  useEffect(() => {
    if (!authed) return;
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
  }, [authed]);

  const handleMarkRead = (id: string) => {
    setConfessions((prev) => prev.map((c) => (c.id === id ? { ...c, is_read: true } : c)));
  };

  const filtered = confessions.filter((c) => {
    if (filter === "unread") return !c.is_read && isUnlocked(c);
    if (filter === "sealed") return !isUnlocked(c);
    return true;
  });

  const unreadCount = confessions.filter((c) => !c.is_read && isUnlocked(c)).length;
  const sealedCount = confessions.filter((c) => !isUnlocked(c)).length;

  /* ── The gate ── */
  if (!authed) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.25rem",
        }}
      >
        <div className="rise" style={{ width: "100%", maxWidth: 400 }}>
          <div className="airmail" />
          <div
            className="sheet"
            style={{ borderRadius: "0 0 6px 6px", padding: "2.5rem 2rem 2.25rem", textAlign: "center" }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.4rem" }}>
              <Postmark
                size={84}
                ring="REGISTERED MAIL · ADDRESSEE ONLY · PRIVATE ·"
                line1="P.O."
                line2="BOX 2"
                style={{ color: "var(--wax)", opacity: 0.65, transform: "rotate(-7deg)" }}
              />
            </div>

            <h1
              style={{
                fontFamily: "var(--serif)",
                fontWeight: 300,
                fontSize: "1.9rem",
                color: "var(--ink-strong)",
                marginBottom: "0.5rem",
              }}
            >
              The mailbox
            </h1>
            <p
              style={{
                fontFamily: "var(--serif)",
                fontStyle: "italic",
                fontSize: "0.9rem",
                color: "var(--ink-soft)",
                marginBottom: "2rem",
              }}
            >
              These letters are addressed to {config.readerName} only.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <motion.input
                type="password"
                className="passcode"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="the passcode"
                animate={wrongPassword ? { x: [-8, 8, -8, 8, 0] } : {}}
                transition={{ duration: 0.4 }}
                style={wrongPassword ? { borderColor: "rgba(167,47,34,0.55)" } : {}}
              />

              <AnimatePresence>
                {wrongPassword && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      fontFamily: "var(--serif)",
                      fontStyle: "italic",
                      fontSize: "0.82rem",
                      color: "var(--wax)",
                    }}
                  >
                    that&rsquo;s not the word ✕
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="button"
                className="btn-wax"
                onClick={handleLogin}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                Unlock the box
              </motion.button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ── The mailbox ── */
  return (
    <main style={{ minHeight: "100vh", padding: "clamp(3rem, 7vh, 4.5rem) 1.25rem 7rem" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: "2.75rem" }}
        >
          <p className="tw" style={{ marginBottom: "1rem" }}>
            Registered mail · addressee only
          </p>
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
              {filtered.map((c) =>
                isUnlocked(c) ? (
                  <UnlockedCard key={c.id} confession={c} onMarkRead={handleMarkRead} />
                ) : (
                  <LockedCard key={c.id} confession={c} />
                ),
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}
