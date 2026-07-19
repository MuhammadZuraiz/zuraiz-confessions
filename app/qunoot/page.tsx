"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LockedCard from "@/components/LockedCard";
import PasscodeGate from "@/components/PasscodeGate";
import PrivateSleeve from "@/components/PrivateSleeve";
import SealedReadyCard from "@/components/SealedReadyCard";
import UnlockedCard from "@/components/UnlockedCard";
import { config } from "@/lib/config";
import { formatMonthsAgo, isSpicy, isUnlocked, monthsAgoToday, needsCeremony, type Confession } from "@/lib/confessions";
import { privateJson } from "@/lib/private-api";

type Filter = "all" | "unread" | "sealed" | "flirty" | "spicy";

function cover(confession: Confession): Confession {
  return {
    ...confession,
    text: null,
    image_url: null,
    image_urls: [],
    audio_url: null,
    video_url: null,
    concealed: true,
  };
}

function Mailbox({ lock }: { lock: () => Promise<void> }) {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let active = true;
    privateJson<{ confessions: Confession[] }>("/api/confessions?view=mailbox")
      .then((result) => active && setConfessions(result.confessions))
      .catch((caught: Error) => active && setError(caught.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const coverPrivate = () => setConfessions((current) =>
      current.map((item) => isSpicy(item) ? cover(item) : item));
    const visibility = () => { if (document.hidden) coverPrivate(); };
    window.addEventListener("blur", coverPrivate);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", coverPrivate);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const replace = (updated: Confession) => setConfessions((current) =>
    current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
  const update = (id: string, patch: Partial<Confession>) => setConfessions((current) =>
    current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const filtered = confessions.filter((item) => {
    if (filter === "unread") return !item.is_read && isUnlocked(item);
    if (filter === "sealed") return !isUnlocked(item) || needsCeremony(item);
    if (filter === "flirty" || filter === "spicy") return item.mood === filter;
    return true;
  });
  const unread = confessions.filter((item) => !item.is_read && isUnlocked(item)).length;
  const sealed = confessions.filter((item) => !isUnlocked(item) || needsCeremony(item)).length;
  const onThisDay = useMemo(() => confessions
    .filter((item) => !isSpicy(item) && Boolean(item.text) && isUnlocked(item) && !needsCeremony(item))
    .map((item) => ({ confession: item, months: monthsAgoToday(item) }))
    .filter((entry): entry is { confession: Confession; months: number } => entry.months !== null)
    .sort((a, b) => b.months - a.months)[0], [confessions]);

  return (
    <main className="mailbox-page">
      <div className="mailbox-inner">
        <motion.header initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mailbox-header">
          <div className="mailbox-nav tw"><span>Registered mail · addressee only</span><button type="button" onClick={lock}>Lock the box</button></div>
          <h1>Letters for <em>{config.readerName}</em>{unread > 0 && <span className="stamp-red">{unread} new</span>}</h1>
          <p className="tw">{confessions.length} letters · {sealed} sealed · {unread} unread</p>
        </motion.header>

        {onThisDay && <button type="button" className="otd" onClick={() => document.getElementById(`letter-${onThisDay.confession.id}`)?.scrollIntoView({ behavior: "smooth" })}>
          <span className="tw">✦ On this day · {formatMonthsAgo(onThisDay.months)} ago</span>
          <span>&ldquo;{onThisDay.confession.text?.slice(0, 110)}&rdquo;</span>
        </button>}

        <div className="mailbox-filters" aria-label="Mailbox filters">
          {(["all", "unread", "sealed", "flirty", "spicy"] as const).map((value) => (
            <button key={value} type="button"
              className={`chip${filter === value ? " active" : ""}${value === "spicy" ? " chip--private" : ""}`}
              onClick={() => setFilter(value)}>
              {value === "spicy" ? "Spicy vault" : value}
            </button>
          ))}
        </div>

        {loading ? <p className="mailbox-empty">sorting the private post…</p>
          : error ? <p className="mailbox-empty form-error">{error}</p>
          : filtered.length === 0 ? <p className="mailbox-empty">No letters in this tray.</p>
          : <div className="mailbox-stack"><AnimatePresence>{filtered.map((confession) => (
            <div key={confession.id} id={`letter-${confession.id}`}>
              {!isUnlocked(confession) ? <LockedCard confession={confession} />
                : needsCeremony(confession) ? <SealedReadyCard confession={confession} onUpdate={update} />
                : confession.concealed ? <PrivateSleeve confession={confession} onReveal={replace} />
                : <UnlockedCard confession={confession} onUpdate={update}
                    onCover={isSpicy(confession) ? () => replace(cover(confession)) : undefined} />}
            </div>
          ))}</AnimatePresence></div>}
      </div>
    </main>
  );
}

export default function QunootPage() {
  return (
    <PasscodeGate role="reader" title="The mailbox" subtitle={`These letters are addressed to ${config.readerName} only.`}
      postmark={{ ring: "REGISTERED MAIL · ADDRESSEE ONLY · PRIVATE ·", line1: "P.O.", line2: "BOX 2" }}
      buttonLabel="Unlock the box">
      {(lock) => <Mailbox lock={lock} />}
    </PasscodeGate>
  );
}
