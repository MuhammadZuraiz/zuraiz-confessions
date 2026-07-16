"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Lightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: string[];
  /** Index of the open image, or null when closed. */
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const open = index !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && images.length > 1) onNavigate((index! + 1) % images.length);
      if (e.key === "ArrowLeft" && images.length > 1)
        onNavigate((index! - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, index, images.length, onClose, onNavigate]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.img
            key={index}
            className="lightbox-img"
            src={images[index!]}
            alt={`Photo ${index! + 1} of ${images.length}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          />

          <button
            type="button"
            className="lightbox-btn"
            style={{ top: 18, right: 18 }}
            onClick={onClose}
            aria-label="Close photo viewer"
          >
            ✕
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox-btn"
                style={{ left: 14, top: "50%", transform: "translateY(-50%)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate((index! - 1 + images.length) % images.length);
                }}
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                className="lightbox-btn"
                style={{ right: 14, top: "50%", transform: "translateY(-50%)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate((index! + 1) % images.length);
                }}
                aria-label="Next photo"
              >
                ›
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
