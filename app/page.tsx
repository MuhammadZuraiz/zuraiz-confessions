"use client";

import ConfessionForm from "@/components/ConfessionForm";
import PasscodeGate from "@/components/PasscodeGate";
import Postmark from "@/components/Postmark";
import { config } from "@/lib/config";

function WritingDesk({ lock }: { lock: () => Promise<void> }) {
  return (
    <main className="writing-desk">
      <header className="writing-header">
        <div className="desk-nav tw">
          <span>Private correspondence · one reader only</span>
          <button type="button" onClick={lock}>Lock the desk</button>
        </div>
        <div className="rise writing-postmark"><Postmark size={98} style={{ color: "var(--ink)", opacity: 0.55, transform: "rotate(-8deg)" }} /></div>
        <h1 className="rise rise-2">Say it in a <em>letter</em><span>.</span></h1>
        <p className="rise rise-3">Soft, teasing, or for her eyes only.<br />Post it now, or seal it until a day you choose.</p>
      </header>
      <div className="rise rise-4 writing-letter"><ConfessionForm /></div>
      <footer className="writing-footer">
        <div className="airmail" />
        <p className="tw">Made for two · private by design · <a href="/admin">the mailbox</a> · <a href="/sent">your ledger</a></p>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <PasscodeGate role="writer" title="The writing desk" subtitle={`Only ${config.writerName} can enter this private desk.`}
      postmark={{ ring: "PRIVATE POST · WRITER ONLY · SEALED ·", line1: "WRITE", line2: "IN PRIVATE", color: "var(--post-blue)" }}
      buttonLabel="Unlock the desk">
      {(lock) => <WritingDesk lock={lock} />}
    </PasscodeGate>
  );
}
