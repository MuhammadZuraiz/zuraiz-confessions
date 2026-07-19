"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { config } from "@/lib/config";
import { formatLongDate } from "@/lib/confessions";
import { getMood, type ConfessionMood } from "@/lib/moods";
import { makePrivatePhoto } from "@/lib/photo-privacy";
import { privateJson, uploadFilm, uploadPrivateEnclosure } from "@/lib/private-api";
import { getStationery } from "@/lib/stationery";
import MoodPicker from "@/components/MoodPicker";
import VoiceRecorder, { type RecordedAudio } from "@/components/VoiceRecorder";

const MAX_IMAGE_BYTES = config.maxImageMb * 1024 * 1024;
const MAX_FILM_BYTES = 1024 * 1024 * 1024; // 1 GB safety ceiling per film
const FILM_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};
const COOLDOWN_KEY = "confession-post-last-submit";
const DRAFT_KEY = "confession-post-draft-v2";
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type SelectedImage = { id: string; file: File; preview: string };

function cooldownSeconds() {
  try {
    const last = Number(window.localStorage.getItem(COOLDOWN_KEY) || "0");
    return Math.max(0, Math.ceil((config.submitCooldownMs - (Date.now() - last)) / 1000));
  } catch {
    return 0;
  }
}

export default function ConfessionForm() {
  const [mood, setMood] = useState<ConfessionMood>("flirty");
  const [text, setText] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [audio, setAudio] = useState<RecordedAudio | null>(null);
  const [film, setFilm] = useState<File | null>(null);
  const [filmProgress, setFilmProgress] = useState<number | null>(null);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sealedUntil, setSealedUntil] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const filmRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<SelectedImage[]>([]);
  const reduceMotion = useReducedMotion();

  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => () => imagesRef.current.forEach((image) => URL.revokeObjectURL(image.preview)), []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        window.localStorage.removeItem("confession-post-draft");
        const raw = window.localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw) as { text?: string; unlockDate?: string; mood?: string; savedAt?: number };
        if (!draft.text?.trim() || !draft.savedAt || Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS || draft.mood === "spicy") {
          window.localStorage.removeItem(DRAFT_KEY);
          return;
        }
        setText(draft.text);
        setMood("flirty");
        const today = new Date().toISOString().split("T")[0];
        if (draft.unlockDate && draft.unlockDate >= today) setUnlockDate(draft.unlockDate);
        setDraftRestored(true);
        window.setTimeout(() => setDraftRestored(false), 5000);
      } catch {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (mood === "spicy" || submitting || !text.trim()) {
          window.localStorage.removeItem(DRAFT_KEY);
          return;
        }
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ text, unlockDate, mood, savedAt: Date.now() }));
      } catch {
        // Draft saving is convenience only; posting still works without browser storage.
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [text, unlockDate, mood, submitting]);

  const changeMood = (next: ConfessionMood) => {
    setMood(next);
    if (next === "spicy") {
      setDraftRestored(false);
      try { window.localStorage.removeItem(DRAFT_KEY); } catch {}
    }
  };

  const clearImages = () => {
    images.forEach((image) => URL.revokeObjectURL(image.preview));
    setImages([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return current.filter((image) => image.id !== id);
    });
  };

  const chooseImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setError(null);
    if (images.length + files.length > config.maxImages) {
      setError(`You can enclose up to ${config.maxImages} photos.`);
      return;
    }
    if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
      setError(`Please keep each original photo under ${config.maxImageMb} MB.`);
      return;
    }

    setProcessingPhotos(true);
    const processed: SelectedImage[] = [];
    try {
      for (const file of files) {
        const privateFile = await makePrivatePhoto(file);
        if (privateFile.size > MAX_IMAGE_BYTES) {
          throw new Error(`A re-encoded photo exceeds ${config.maxImageMb} MB.`);
        }
        processed.push({ id: crypto.randomUUID(), file: privateFile, preview: URL.createObjectURL(privateFile) });
      }
      setImages((current) => [...current, ...processed]);
    } catch (caught) {
      processed.forEach((image) => URL.revokeObjectURL(image.preview));
      setError(caught instanceof Error ? caught.message : "A photo could not be privately processed.");
    } finally {
      setProcessingPhotos(false);
    }
  };

  const chooseFilm = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (!FILM_TYPES[file.type]) {
      setError("Please choose an MP4, MOV, or WebM film.");
      return;
    }
    if (file.size > MAX_FILM_BYTES) {
      setError("Please keep a film under 1 GB.");
      return;
    }
    setFilm(file);
  };

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting || processingPhotos) return;
    const remaining = cooldownSeconds();
    if (remaining) {
      setError(`The post office needs ${remaining}s before your next letter.`);
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const imagePaths: string[] = [];
      for (const image of images) {
        imagePaths.push(await uploadPrivateEnclosure({ kind: "image", data: image.file, contentType: "image/webp" }));
      }
      const audioPath = audio
        ? await uploadPrivateEnclosure({ kind: "audio", data: audio.blob, contentType: audio.contentType })
        : null;

      let videoPath: string | null = null;
      if (film) {
        setFilmProgress(0);
        videoPath = await uploadFilm({ file: film, contentType: film.type, onProgress: setFilmProgress });
        setFilmProgress(null);
      }

      await privateJson("/api/confessions", {
        method: "POST",
        body: JSON.stringify({ text: trimmed, mood, unlockDate: unlockDate || null, imagePaths, audioPath, videoPath }),
      });

      setSealedUntil(unlockDate || null);
      setText("");
      clearImages();
      setUnlockDate("");
      if (audio) URL.revokeObjectURL(audio.url);
      setAudio(null);
      setFilm(null);
      try {
        window.localStorage.removeItem(DRAFT_KEY);
        window.localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      } catch {}
      setSubmitted(true);
      window.setTimeout(() => setSubmitted(false), 5000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The letter could not be posted.");
    } finally {
      setFilmProgress(null);
      setSubmitting(false);
    }
  };

  const moodInfo = getMood(mood);
  const stationery = moodInfo.defaultStationery;
  const today = new Date().toISOString().split("T")[0];
  const busy = submitting || processingPhotos;

  return (
    <div style={{ position: "relative" }}>
      <div className={`airmail${mood === "spicy" ? " airmail--private" : ""}`} />
      <div className={`sheet ${getStationery(stationery).className} letter-compose letter-compose--${mood}`.trim()}>
        <motion.div animate={{ opacity: submitted ? 0.2 : 1 }}>
          <section className="compose-section">
            <span className="tw field-label">Set the mood</span>
            <MoodPicker value={mood} onChange={changeMood} disabled={busy} />
          </section>

          {mood === "spicy" && (
            <div className="private-notice" role="note">
              <strong>Private enclosure</strong>
              <span>This letter stays only in this tab until posted. No local draft is saved.</span>
            </div>
          )}

          <section className="compose-section">
            <label htmlFor="confession-text" className="tw field-label">The confession</label>
            <AnimatePresence>
              {draftRestored && <motion.p className="draft-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Your unsent draft was restored. ✎</motion.p>}
            </AnimatePresence>
            <textarea id="confession-text" className="letter-input" value={text} onChange={(event) => setText(event.target.value)}
              placeholder={mood === "spicy" ? "For your eyes only…" : "Dear you — here's what I never said…"}
              rows={7} disabled={busy} maxLength={20000} />
          </section>

          <section className="compose-section">
            <label htmlFor="confession-seal" className="tw field-label">Seal until <span className="field-hint">(optional)</span></label>
            <input id="confession-seal" type="date" className="date-input" value={unlockDate} min={today}
              onChange={(event) => setUnlockDate(event.target.value)} disabled={busy} />
            {unlockDate && <p className="seal-note">{config.readerName} can break the seal on {formatLongDate(unlockDate)}.</p>}
          </section>

          <section className="compose-section">
            <span className="tw field-label">Enclose photos <span className="field-hint">(optional — metadata removed)</span></span>
            {images.length > 0 && <div className="compose-photos">
              {images.map((image, index) => <div className="snapshot" key={image.id} style={{ rotate: index % 2 ? "1.5deg" : "-1.5deg" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.preview} alt={`Enclosed photo ${index + 1}`} />
                <button type="button" className="remove" onClick={() => removeImage(image.id)} aria-label={`Remove photo ${index + 1}`}>✕</button>
              </div>)}
            </div>}
            {images.length < config.maxImages && <button type="button" className="btn-enclose" onClick={() => fileRef.current?.click()} disabled={busy}>
              + {processingPhotos ? "removing private metadata…" : images.length ? "enclose another" : "enclose photos"}
            </button>}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseImages} hidden />
          </section>

          <section className="compose-section">
            <span className="tw field-label">Add your voice <span className="field-hint">(optional)</span></span>
            <VoiceRecorder value={audio} onChange={setAudio} disabled={busy} />
          </section>

          <section className="compose-section">
            <span className="tw field-label">Enclose a film <span className="field-hint">(optional — sent as recorded)</span></span>
            {film ? (
              <div className="film-chip">
                <span aria-hidden="true">🎞</span>
                <span className="film-chip__name">{film.name}</span>
                <button type="button" className="btn-ghost" onClick={() => setFilm(null)} disabled={busy}>
                  Remove ✕
                </button>
              </div>
            ) : (
              <button type="button" className="btn-enclose" onClick={() => filmRef.current?.click()} disabled={busy}>
                + enclose a film
              </button>
            )}
            <input ref={filmRef} type="file" accept="video/mp4,video/quicktime,video/webm" onChange={chooseFilm} hidden />
          </section>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="compose-submit">
            <span className="tw">{moodInfo.label} post · {unlockDate ? "wax sealed" : "first class"}</span>
            <motion.button type="button" className="btn-wax" onClick={submit} disabled={busy || !text.trim()}
              whileHover={!reduceMotion ? { scale: 1.03 } : {}} whileTap={!reduceMotion ? { scale: 0.97 } : {}}>
              {submitting
                ? filmProgress !== null
                  ? `Posting the film… ${filmProgress}%`
                  : "Sealing…"
                : unlockDate
                  ? "Seal & post"
                  : "Post the letter"}
            </motion.button>
          </div>
        </motion.div>

        <AnimatePresence>
          {submitted && <motion.div className="success-stamp" initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="stamp-red">{sealedUntil ? <>Sealed<span>Opens {formatLongDate(sealedUntil)}</span></> : <>Delivered<span>{moodInfo.label} post</span></>}</div>
          </motion.div>}
        </AnimatePresence>
      </div>
    </div>
  );
}
