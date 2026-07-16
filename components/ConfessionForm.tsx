"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import { formatLongDate } from "@/lib/confessions";
import { getStationery, type StationeryId } from "@/lib/stationery";
import StationeryPicker from "@/components/StationeryPicker";
import VoiceRecorder, { type RecordedAudio } from "@/components/VoiceRecorder";

const MAX_IMAGE_BYTES = config.maxImageMb * 1024 * 1024;
const COOLDOWN_KEY = "confession-post-last-submit";
const DRAFT_KEY = "confession-post-draft";
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type SelectedImage = {
  id: string;
  file: File;
  preview: string;
};

function getCooldownSeconds() {
  const lastSubmit = Number(window.localStorage.getItem(COOLDOWN_KEY) || "0");
  const remaining = config.submitCooldownMs - (Date.now() - lastSubmit);
  return Math.max(0, Math.ceil(remaining / 1000));
}

function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export default function ConfessionForm() {
  const [text, setText] = useState("");
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [unlockDate, setUnlockDate] = useState("");
  const [stationery, setStationery] = useState<StationeryId>("cream");
  const [audio, setAudio] = useState<RecordedAudio | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Remembered at submit time so the success stamp can still name the seal
  // date after the field is cleared.
  const [sealedUntil, setSealedUntil] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<SelectedImage[]>([]);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Restore an unsent draft (text, seal date, stationery) on mount.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw) as {
          text?: string;
          unlockDate?: string;
          stationery?: string;
          savedAt?: number;
        };
        if (!draft.text?.trim() || !draft.savedAt || Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
          window.localStorage.removeItem(DRAFT_KEY);
          return;
        }
        setText(draft.text);
        const today = new Date().toISOString().split("T")[0];
        if (draft.unlockDate && draft.unlockDate >= today) setUnlockDate(draft.unlockDate);
        if (["cream", "rose", "midnight"].includes(draft.stationery ?? "")) {
          setStationery(draft.stationery as StationeryId);
        }
        setDraftRestored(true);
        window.setTimeout(() => setDraftRestored(false), 5000);
      } catch {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave the draft (debounced) so a half-written letter survives a closed tab.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (submitting) return;
      if (!text.trim()) {
        window.localStorage.removeItem(DRAFT_KEY);
        return;
      }
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ text, unlockDate, stationery, savedAt: Date.now() }),
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [text, unlockDate, stationery, submitting]);

  useEffect(
    () => () => {
      imagesRef.current.forEach(({ preview }) => URL.revokeObjectURL(preview));
    },
    [],
  );

  const clearImages = () => {
    images.forEach(({ preview }) => URL.revokeObjectURL(preview));
    setImages([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return current.filter((image) => image.id !== id);
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);

    if (images.length + files.length > config.maxImages) {
      setError(`You can enclose up to ${config.maxImages} photos.`);
      return;
    }

    if (files.some((file) => !IMAGE_EXTENSIONS[file.type])) {
      setError("Please choose a JPG, PNG, or WebP photo.");
      return;
    }

    if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
      setError(`Please keep each photo under ${config.maxImageMb} MB.`);
      return;
    }

    setImages((current) => [
      ...current,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
  };

  const handleSubmit = async () => {
    const trimmedText = text.trim();
    if (!trimmedText || submitting) return;

    const cooldownSeconds = getCooldownSeconds();
    if (cooldownSeconds > 0) {
      setError(`The post office needs ${cooldownSeconds}s before your next letter.`);
      return;
    }

    if (images.length > config.maxImages) {
      setError(`You can enclose up to ${config.maxImages} photos.`);
      return;
    }

    if (images.some(({ file }) => !IMAGE_EXTENSIONS[file.type] || file.size > MAX_IMAGE_BYTES)) {
      setError(`Please choose a JPG, PNG, or WebP photo under ${config.maxImageMb} MB.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    const imagePaths: string[] = [];
    for (const { file } of images) {
      const ext = IMAGE_EXTENSIONS[file.type];
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("confession-images")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        setError("A photo failed to upload. Try again, or post without it.");
        setSubmitting(false);
        return;
      }

      imagePaths.push(path);
    }

    let audioPath: string | null = null;
    if (audio) {
      const path = `${crypto.randomUUID()}.${audio.ext}`;
      const { error: audioError } = await supabase.storage
        .from("confession-audio")
        .upload(path, audio.blob, {
          cacheControl: "3600",
          contentType: audio.contentType,
          upsert: false,
        });

      if (audioError) {
        setError("The voice note failed to upload. Try again, or post without it.");
        setSubmitting(false);
        return;
      }

      audioPath = path;
    }

    const formData = new FormData();
    formData.set("text", trimmedText);
    if (unlockDate) formData.set("unlockDate", unlockDate);
    formData.set("stationery", stationery);
    if (audioPath) formData.set("audioPath", audioPath);
    imagePaths.forEach((path) => formData.append("imagePaths", path));

    let response: Response;
    try {
      response = await fetch("/api/confessions", {
        method: "POST",
        body: formData,
      });
    } catch {
      setError("The post office could not be reached. Please try again.");
      setSubmitting(false);
      return;
    }
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error || "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setSealedUntil(unlockDate || null);
    setText("");
    clearImages();
    setUnlockDate("");
    if (audio) {
      URL.revokeObjectURL(audio.url);
      setAudio(null);
    }
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const canSubmit = !submitting && text.trim().length > 0;
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div style={{ position: "relative" }}>
      <div className="airmail" />
      <div
        className={`sheet ${getStationery(stationery).className}`.trim()}
        style={{
          borderRadius: "0 0 6px 6px",
          padding: "clamp(1.5rem, 4.5vw, 2.75rem)",
          transition: "background 0.5s ease, border-color 0.5s ease",
        }}
      >
        {/* Decorative postage stamp */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            width: 58,
            height: 70,
            background: "#fff",
            border: "1px solid var(--line)",
            boxShadow: "0 4px 10px rgba(42,51,80,0.12)",
            transform: "rotate(3.5deg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: 4,
          }}
        >
          <div style={{ position: "absolute", inset: 4, border: "1px solid rgba(42,51,80,0.14)" }} />
          <span style={{ color: "var(--wax)", fontSize: "1.15rem", lineHeight: 1 }}>♥</span>
          <span className="tw" style={{ fontSize: "0.42rem", letterSpacing: "0.18em" }}>
            Forever
          </span>
        </div>

        {/* Dim the letter while the success stamp is pressed */}
        <motion.div animate={{ opacity: submitted ? 0.22 : 1 }} transition={{ duration: 0.35 }}>
          {/* Stationery */}
          <div style={{ marginBottom: "1.9rem", paddingRight: 64 }}>
            <span className="tw field-label">Stationery</span>
            <StationeryPicker value={stationery} onChange={setStationery} disabled={submitting} />
          </div>

          {/* The confession */}
          <div style={{ marginBottom: "2.1rem" }}>
            <label htmlFor="confession-text" className="tw field-label">
              The confession
            </label>
            <AnimatePresence>
              {draftRestored && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    fontFamily: "var(--serif)",
                    fontStyle: "italic",
                    fontSize: "0.8rem",
                    color: "var(--ink-faint)",
                    marginBottom: "0.6rem",
                  }}
                >
                  Your unsent draft was restored. ✎
                </motion.p>
              )}
            </AnimatePresence>
            <textarea
              id="confession-text"
              className="letter-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Dear you — here's what I never said…"
              rows={7}
              disabled={submitting}
            />
          </div>

          {/* Seal date */}
          <div style={{ marginBottom: "2.1rem" }}>
            <label htmlFor="confession-seal" className="tw field-label">
              Seal until{" "}
              <span className="field-hint">(optional — leave blank to deliver right away)</span>
            </label>
            <input
              id="confession-seal"
              type="date"
              className="date-input"
              value={unlockDate}
              min={todayStr}
              onChange={(e) => setUnlockDate(e.target.value)}
              disabled={submitting}
            />
            <AnimatePresence>
              {unlockDate && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    marginTop: "0.65rem",
                    fontFamily: "var(--serif)",
                    fontStyle: "italic",
                    fontSize: "0.85rem",
                    color: "var(--wax)",
                  }}
                >
                  {capitalize(config.pronoun.subject)} won&rsquo;t be able to open this until{" "}
                  {formatLongDate(unlockDate)}.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Photos */}
          <div style={{ marginBottom: "2.1rem" }}>
            <span className="tw field-label">
              Enclose photos{" "}
              <span className="field-hint">(optional — up to {config.maxImages})</span>
            </span>

            {images.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                  gap: "1rem",
                  marginBottom: images.length < config.maxImages ? "1rem" : 0,
                  padding: "0.4rem 0.2rem",
                }}
              >
                <AnimatePresence>
                  {images.map(({ id, preview }, index) => (
                    <motion.div
                      key={id}
                      className="snapshot"
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94 }}
                      style={{ rotate: index % 2 === 0 ? -1.6 : 1.8 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt={`Enclosed photo ${index + 1}`} />
                      <button
                        type="button"
                        className="remove"
                        aria-label={`Remove enclosed photo ${index + 1}`}
                        onClick={() => removeImage(id)}
                      >
                        ✕
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {images.length < config.maxImages && (
              <button
                type="button"
                className="btn-enclose"
                onClick={() => fileRef.current?.click()}
                disabled={submitting}
              >
                <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>+</span>
                {images.length > 0 ? "enclose another" : "enclose photos"}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImages}
              style={{ display: "none" }}
            />
          </div>

          {/* Voice note */}
          <div style={{ marginBottom: "2.1rem" }}>
            <span className="tw field-label">
              Add your voice <span className="field-hint">(optional)</span>
            </span>
            <VoiceRecorder value={audio} onChange={setAudio} disabled={submitting} />
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  fontFamily: "var(--serif)",
                  fontStyle: "italic",
                  fontSize: "0.85rem",
                  color: "var(--wax)",
                  marginBottom: "1.2rem",
                }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Post it */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              borderTop: "1px solid var(--rule)",
              paddingTop: "1.5rem",
            }}
          >
            <span className="tw" style={{ fontSize: "0.55rem" }}>
              {unlockDate ? "Wax seal will be applied" : "First-class delivery"}
            </span>
            <motion.button
              type="button"
              className="btn-wax"
              onClick={handleSubmit}
              disabled={!canSubmit}
              whileHover={canSubmit && !shouldReduceMotion ? { scale: 1.03 } : {}}
              whileTap={canSubmit && !shouldReduceMotion ? { scale: 0.96 } : {}}
            >
              {submitting ? "Sealing…" : unlockDate ? "Seal & post" : "Post the letter"}
            </motion.button>
          </div>
        </motion.div>

        {/* Success stamp */}
        <AnimatePresence>
          {submitted && (
            <motion.div
              key="stamp"
              initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 1.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                pointerEvents: "none",
              }}
            >
              <div
                className="stamp-red"
                style={{
                  fontSize: "0.85rem",
                  letterSpacing: "0.3em",
                  padding: "1rem 1.6rem 0.9rem",
                  border: "3px double var(--wax)",
                  borderRadius: 6,
                  transform: "rotate(-8deg)",
                  background: "transparent",
                  textAlign: "center",
                }}
              >
                {sealedUntil ? (
                  <>
                    Sealed
                    <span style={{ display: "block", fontSize: "0.6rem", marginTop: 6 }}>
                      Opens {formatLongDate(sealedUntil)}
                    </span>
                  </>
                ) : (
                  <>
                    Delivered
                    <span style={{ display: "block", fontSize: "0.6rem", marginTop: 6 }}>
                      First class
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
