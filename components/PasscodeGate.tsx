"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Postmark from "@/components/Postmark";

type PostmarkSpec = {
  ring: string;
  line1: string;
  line2: string;
  color?: string;
};

/**
 * Simple client-side passcode gate with a "remember me" flag in
 * localStorage. Children receive a `lock` callback that signs out.
 */
export default function PasscodeGate({
  title,
  subtitle,
  password,
  storageKey,
  postmark,
  buttonLabel = "Unlock",
  children,
}: {
  title: string;
  subtitle: string;
  password: string;
  storageKey: string;
  postmark: PostmarkSpec;
  buttonLabel?: string;
  children: (lock: () => void) => React.ReactNode;
}) {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        setAuthed(window.localStorage.getItem(storageKey) === "1");
      } catch {
        setAuthed(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const handleLogin = () => {
    if (input === password) {
      try {
        window.localStorage.setItem(storageKey, "1");
      } catch {
        // Private browsing modes can disable storage; the gate still works
        // for the current page view.
      }
      setAuthed(true);
    } else {
      setWrong(true);
      setTimeout(() => setWrong(false), 2000);
    }
  };

  const lock = () => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // The in-memory auth state below is enough to lock this page view.
    }
    setInput("");
    setAuthed(false);
  };

  if (authed) return <>{children(lock)}</>;

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
              ring={postmark.ring}
              line1={postmark.line1}
              line2={postmark.line2}
              style={{
                color: postmark.color ?? "var(--wax)",
                opacity: 0.65,
                transform: "rotate(-7deg)",
              }}
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
            {title}
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
            {subtitle}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <label htmlFor={`${storageKey}-passcode`} className="sr-only">
              Passcode
            </label>
            <motion.input
              id={`${storageKey}-passcode`}
              type="password"
              className="passcode"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="the passcode"
              autoComplete="current-password"
              autoFocus
              animate={wrong ? { x: [-8, 8, -8, 8, 0] } : {}}
              transition={{ duration: 0.4 }}
              style={wrong ? { borderColor: "rgba(167,47,34,0.55)" } : {}}
            />

            <AnimatePresence>
              {wrong && (
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
              {buttonLabel}
            </motion.button>
          </div>
        </div>
      </div>
    </main>
  );
}
