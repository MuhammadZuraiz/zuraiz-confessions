import ConfessionForm from "@/components/ConfessionForm";
import Postmark from "@/components/Postmark";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "clamp(3rem, 8vh, 5.5rem) 1.25rem 6rem",
      }}
    >
      {/* Header */}
      <header style={{ textAlign: "center", maxWidth: 640, marginBottom: "clamp(2.5rem, 6vw, 3.75rem)" }}>
        <div className="rise" style={{ display: "flex", justifyContent: "center", marginBottom: "1.6rem" }}>
          <Postmark
            size={98}
            style={{ color: "var(--ink)", opacity: 0.55, transform: "rotate(-8deg)" }}
          />
        </div>

        <p className="tw rise rise-1" style={{ marginBottom: "1.3rem" }}>
          Private correspondence · one reader only
        </p>

        <h1
          className="rise rise-2"
          style={{
            fontFamily: "var(--serif)",
            fontWeight: 300,
            fontSize: "clamp(2.7rem, 8vw, 4.4rem)",
            lineHeight: 1.08,
            letterSpacing: "-0.01em",
            color: "var(--ink-strong)",
            marginBottom: "1.1rem",
          }}
        >
          Say it in a{" "}
          <em style={{ fontStyle: "italic", fontWeight: 400 }}>letter</em>
          <span style={{ color: "var(--wax)" }}>.</span>
        </h1>

        <p
          className="rise rise-3"
          style={{
            fontFamily: "var(--serif)",
            fontStyle: "italic",
            fontSize: "clamp(1rem, 2.4vw, 1.15rem)",
            lineHeight: 1.65,
            color: "var(--ink-soft)",
          }}
        >
          Whatever you can&rsquo;t say out loud — write it down.
          <br />
          Post it now, or seal it until a day you choose.
        </p>
      </header>

      {/* The letter */}
      <div className="rise rise-4" style={{ width: "100%", maxWidth: 640 }}>
        <ConfessionForm />
      </div>

      {/* Footer */}
      <footer style={{ width: "100%", maxWidth: 640, marginTop: "4rem", textAlign: "center" }}>
        <div className="airmail" style={{ borderRadius: 2, marginBottom: "1.2rem", opacity: 0.5 }} />
        <p className="tw" style={{ fontSize: "0.56rem" }}>
          Hand-made for two · nothing here is public ·{" "}
          <a href="/admin" style={{ borderBottom: "1px solid var(--line)" }}>
            the mailbox
          </a>{" "}
          ·{" "}
          <a href="/sent" style={{ borderBottom: "1px solid var(--line)" }}>
            your ledger
          </a>
        </p>
      </footer>
    </main>
  );
}
