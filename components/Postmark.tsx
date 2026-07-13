import type { CSSProperties } from "react";

type PostmarkProps = {
  size?: number;
  /** Text that runs around the ring. */
  ring?: string;
  /** Two short lines stamped in the middle. */
  line1?: string;
  line2?: string;
  style?: CSSProperties;
  className?: string;
};

/** Circular rubber postmark, drawn in currentColor. */
export default function Postmark({
  size = 108,
  ring = "THE CONFESSION POST · FIRST CLASS MAIL ·",
  line1 = "EST.",
  line2 = "2026",
  style,
  className,
}: PostmarkProps) {
  const id = `pm-${ring.length}-${line2}`.replace(/[^a-zA-Z0-9-]/g, "");
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <path
          id={id}
          d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"
          fill="none"
        />
      </defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.8" />
      <circle cx="60" cy="60" r="53" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.65" />
      <text
        fontSize="9.5"
        letterSpacing="2.4"
        fill="currentColor"
        style={{ fontFamily: "var(--type)", textTransform: "uppercase" }}
      >
        <textPath href={`#${id}`}>{ring}</textPath>
      </text>
      <text
        x="60"
        y="56"
        textAnchor="middle"
        fontSize="10"
        letterSpacing="2"
        fill="currentColor"
        style={{ fontFamily: "var(--type)" }}
      >
        {line1}
      </text>
      <text
        x="60"
        y="72"
        textAnchor="middle"
        fontSize="12"
        letterSpacing="2"
        fill="currentColor"
        style={{ fontFamily: "var(--type)" }}
      >
        {line2}
      </text>
    </svg>
  );
}
