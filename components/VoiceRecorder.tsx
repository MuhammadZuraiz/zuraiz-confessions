"use client";

import { useEffect, useRef, useState } from "react";
import { config } from "@/lib/config";

export type RecordedAudio = {
  blob: Blob;
  url: string;
  /** Normalized content type for upload (audio/webm or audio/mp4). */
  contentType: string;
  ext: "webm" | "m4a";
};

function pickRecordingFormat(): { mimeType: string; contentType: string; ext: "webm" | "m4a" } | null {
  const candidates: Array<{ mimeType: string; contentType: string; ext: "webm" | "m4a" }> = [
    { mimeType: "audio/webm;codecs=opus", contentType: "audio/webm", ext: "webm" },
    { mimeType: "audio/webm", contentType: "audio/webm", ext: "webm" },
    { mimeType: "audio/mp4", contentType: "audio/mp4", ext: "m4a" },
  ];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) return candidate;
  }
  return null;
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VoiceRecorder({
  value,
  onChange,
  disabled,
}: {
  value: RecordedAudio | null;
  onChange: (audio: RecordedAudio | null) => void;
  disabled?: boolean;
}) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const valueRef = useRef<RecordedAudio | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSupported(
        typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const teardown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (valueRef.current) URL.revokeObjectURL(valueRef.current.url);
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    const format = pickRecordingFormat();
    if (!format) {
      setError("This browser can't record audio.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("The microphone was blocked — allow it to record a voice note.");
      return;
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: format.mimeType });
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setError("This browser could not start the recording.");
      return;
    }

    streamRef.current = stream;
    recorderRef.current = recorder;
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: format.contentType });
      teardown();
      if (blob.size < 1000) return; // stopped immediately — treat as cancelled
      if (blob.size > config.maxAudioMb * 1024 * 1024) {
        setError(`That voice note is too long — please keep it under ${config.maxAudioMb} MB.`);
        return;
      }
      if (value) URL.revokeObjectURL(value.url);
      onChange({
        blob,
        url: URL.createObjectURL(blob),
        contentType: format.contentType,
        ext: format.ext,
      });
    };

    recorder.start();
    setElapsed(0);
    setRecording(true);
    let seconds = 0;
    timerRef.current = setInterval(() => {
      seconds += 1;
      setElapsed(seconds);
      if (seconds >= config.maxAudioSeconds && recorder.state === "recording") recorder.stop();
    }, 1000);
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const removeAudio = () => {
    if (value) URL.revokeObjectURL(value.url);
    onChange(null);
    setError(null);
  };

  if (!supported) return null;

  return (
    <div>
      {!value && !recording && (
        <button
          type="button"
          className="btn-enclose"
          onClick={startRecording}
          disabled={disabled}
        >
          <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>●</span>
          record a voice note
        </button>
      )}

      {recording && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.9rem",
            border: "1px solid rgba(167, 47, 34, 0.4)",
            borderRadius: 4,
            padding: "0.7rem 1.1rem",
          }}
        >
          <span className="rec-dot" />
          <span className="tw" style={{ color: "var(--wax)", fontSize: "0.72rem" }}>
            Recording {formatElapsed(elapsed)}
          </span>
          <button
            type="button"
            className="btn-ghost"
            onClick={stopRecording}
            style={{ marginLeft: "auto" }}
          >
            Stop
          </button>
        </div>
      )}

      {value && !recording && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <audio className="voice" controls src={value.url} />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn-ghost" onClick={startRecording} disabled={disabled}>
              Re-record
            </button>
            <button type="button" className="btn-ghost" onClick={removeAudio} disabled={disabled}>
              Remove ✕
            </button>
          </div>
        </div>
      )}

      {error && (
        <p
          style={{
            marginTop: "0.6rem",
            fontFamily: "var(--serif)",
            fontStyle: "italic",
            fontSize: "0.82rem",
            color: "var(--wax)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
