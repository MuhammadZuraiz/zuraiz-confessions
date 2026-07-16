"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Postmark from "@/components/Postmark";
import type { SenderRole } from "@/lib/confessions";
import { privateJson } from "@/lib/private-api";

type PostmarkSpec = { ring: string; line1: string; line2: string; color?: string };

export default function PasscodeGate({ role, title, subtitle, postmark, buttonLabel = "Unlock", children }: {
  role: SenderRole;
  title: string;
  subtitle: string;
  postmark: PostmarkSpec;
  buttonLabel?: string;
  children: (lock: () => Promise<void>) => React.ReactNode;
}) {
  const [status, setStatus] = useState<"checking" | "locked" | "open">("checking");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      window.localStorage.removeItem(role === "reader"
        ? "confession-post-mailbox-auth"
        : "confession-post-sent-auth");
    } catch {
      // Legacy client-auth flags are ignored even if browser storage is unavailable.
    }
    privateJson<{ authenticated: boolean }>(`/api/auth/session?role=${role}`)
      .then((result) => active && setStatus(result.authenticated ? "open" : "locked"))
      .catch((caught: Error) => {
        if (active) {
          setStatus("locked");
          setError(caught.message);
        }
      });
    return () => { active = false; };
  }, [role]);

  const login = async () => {
    if (!input || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await privateJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ role, passcode: input }),
      });
      setInput("");
      setStatus("open");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The lock could not be checked.");
    } finally {
      setSubmitting(false);
    }
  };

  const lock = async () => {
    try {
      await privateJson("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
    } finally {
      setInput("");
      setError(null);
      setStatus("locked");
    }
  };

  if (status === "open") return <>{children(lock)}</>;

  return (
    <main className="gate-shell">
      <div className="rise gate-card">
        <div className="airmail" />
        <div className="sheet gate-sheet">
          <Postmark size={84} ring={postmark.ring} line1={postmark.line1} line2={postmark.line2}
            style={{ color: postmark.color ?? "var(--wax)", opacity: 0.65, transform: "rotate(-7deg)" }} />
          <h1>{title}</h1>
          <p>{status === "checking" ? "Checking the private lock…" : subtitle}</p>
          {status === "locked" && (
            <div className="gate-form">
              <label htmlFor={`${role}-passcode`} className="sr-only">Passcode</label>
              <motion.input id={`${role}-passcode`} type="password" className="passcode" value={input}
                onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && login()}
                placeholder="the passcode" autoComplete="current-password" autoFocus
                animate={error ? { x: [-8, 8, -8, 8, 0] } : {}} disabled={submitting} />
              <AnimatePresence>
                {error && <motion.p role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="gate-error">{error}</motion.p>}
              </AnimatePresence>
              <motion.button type="button" className="btn-wax" onClick={login} disabled={submitting || !input}>
                {submitting ? "Checking…" : buttonLabel}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
