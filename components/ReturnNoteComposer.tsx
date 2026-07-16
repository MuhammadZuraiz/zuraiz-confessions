"use client";

import { useEffect, useRef, useState } from "react";
import type { Confession } from "@/lib/confessions";
import { config } from "@/lib/config";
import { getMood } from "@/lib/moods";
import { makePrivatePhoto } from "@/lib/photo-privacy";
import { privateJson, uploadPrivateEnclosure } from "@/lib/private-api";
import VoiceRecorder, { type RecordedAudio } from "@/components/VoiceRecorder";

const MAX_WORDS = 120;

export default function ReturnNoteComposer({ confession, onSent }: {
  confession: Confession;
  onSent: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [audio, setAudio] = useState<RecordedAudio | null>(null);
  const [processing, setProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.preview);
  }, [photo]);

  if (confession.has_reply) {
    return <div className="return-post-sent"><span className="stamp-red">Return post sent</span><p>Your one reply is safely in the outgoing tray.</p></div>;
  }

  const choosePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || audio) return;
    if (file.size > config.maxImageMb * 1024 * 1024) {
      setError(`Please keep the original photo under ${config.maxImageMb} MB.`);
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const privateFile = await makePrivatePhoto(file);
      if (privateFile.size > config.maxImageMb * 1024 * 1024) {
        throw new Error(`The re-encoded photo exceeds ${config.maxImageMb} MB.`);
      }
      if (photo) URL.revokeObjectURL(photo.preview);
      setPhoto({ file: privateFile, preview: URL.createObjectURL(privateFile) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The photo could not be privately processed.");
    } finally {
      setProcessing(false);
    }
  };

  const send = async () => {
    if (!text.trim() || words > MAX_WORDS || sending) return;
    setSending(true);
    setError(null);
    try {
      const imagePaths = photo
        ? [await uploadPrivateEnclosure({ role: "reader", kind: "image", data: photo.file, contentType: "image/webp", parentId: confession.id })]
        : [];
      const audioPath = audio
        ? await uploadPrivateEnclosure({ role: "reader", kind: "audio", data: audio.blob, contentType: audio.contentType, parentId: confession.id })
        : null;
      await privateJson(`/api/confessions/${confession.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ text: text.trim(), imagePaths, audioPath }),
      });
      if (photo) URL.revokeObjectURL(photo.preview);
      if (audio) URL.revokeObjectURL(audio.url);
      onSent();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The return note could not be sent.");
    } finally {
      setSending(false);
    }
  };

  if (!expanded) {
    return <button type="button" className="return-post-prompt" onClick={() => setExpanded(true)}><span>↩</span><strong>Send one return note</strong><small>Up to 120 words, with one optional enclosure.</small></button>;
  }

  return (
    <section className={`return-composer return-composer--${confession.mood}`}>
      <div className="return-composer__head"><div><p className="tw">Brief return post · {getMood(confession.mood).label}</p><h3>Write back once</h3></div><button type="button" className="btn-ghost" onClick={() => setExpanded(false)}>Collapse</button></div>
      {confession.mood === "after-dark" && <div className="private-notice"><strong>Private return</strong><span>This note is never saved as a local draft and follows the same cover rules.</span></div>}
      <textarea className="letter-input" rows={4} value={text} onChange={(event) => setText(event.target.value)} placeholder="A short note back…" disabled={sending} />
      <p className={`word-count${words > MAX_WORDS ? " over" : ""}`}>{words} / {MAX_WORDS} words</p>
      <div className="return-enclosures">
        <div>
          <span className="tw field-label">One photo</span>
          {photo ? <div className="return-photo snapshot">{/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.preview} alt="Return enclosure" /><button className="remove" type="button" onClick={() => { URL.revokeObjectURL(photo.preview); setPhoto(null); }}>✕</button></div>
            : <button type="button" className="btn-enclose" onClick={() => fileRef.current?.click()} disabled={Boolean(audio) || processing || sending}>{processing ? "removing metadata…" : "+ enclose one photo"}</button>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} hidden />
        </div>
        <div>
          <span className="tw field-label">Or one voice note</span>
          <VoiceRecorder value={audio} onChange={setAudio} disabled={Boolean(photo) || sending} />
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="button" className="btn-wax" onClick={send} disabled={sending || !text.trim() || words > MAX_WORDS}>{sending ? "Posting…" : "Send return post"}</button>
    </section>
  );
}
