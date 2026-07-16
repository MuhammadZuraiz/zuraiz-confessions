"use client";

import { useState } from "react";
import Lightbox from "@/components/Lightbox";
import { getConfessionImages, isAfterDark, type Confession } from "@/lib/confessions";
import { getMood } from "@/lib/moods";

export default function ReturnPostBody({ confession, onCover }: { confession: Confession; onCover?: () => void }) {
  const images = getConfessionImages(confession);
  const [lightbox, setLightbox] = useState<number | null>(null);
  return (
    <div className={`return-post-body return-post-body--${confession.mood}`}>
      <div className="return-post-body__head"><span className="stamp-red">Return post</span><span className={`mood-stamp mood-stamp--${confession.mood}`}>{getMood(confession.mood).label}</span></div>
      <p>{confession.text}</p>
      {confession.audio_url && <audio className="voice" controls src={confession.audio_url} preload="metadata" />}
      {images.length > 0 && <div className="letter-photos">{images.map((url, index) => <button key={url} type="button" className="snapshot" onClick={() => setLightbox(index)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Return enclosure" />
      </button>)}</div>}
      <div className="return-post-body__foot"><span className="tw">Received {new Date(confession.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · read ✓</span>
        {isAfterDark(confession) && onCover && <button type="button" className="btn-private" onClick={onCover}>Cover</button>}</div>
      <Lightbox images={images} index={lightbox} onClose={() => setLightbox(null)} onNavigate={setLightbox} />
    </div>
  );
}
