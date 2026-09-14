"use client";

/**
 * The fallback for the one kind of failure everything else on this page
 * can't survive: the root layout itself throwing. Next.js requires this
 * file to render its own `<html>` and `<body>` — it replaces the layout,
 * it doesn't sit inside it.
 *
 * Deliberately built from nothing the rest of the app depends on: no
 * imported components, no design tokens from `globals.css`, no i18n
 * context, no GSAP. If the root layout broke, the safest assumption is
 * that whatever it was built from might be why — this file's only job is
 * to still render.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "2rem",
          textAlign: "center",
          background: "#0d0d0f",
          color: "#f4f4f5",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "clamp(3rem, 12vw, 7rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          Apple Motion
        </p>
        <p style={{ margin: 0, maxWidth: "40ch", fontSize: "15px", lineHeight: 1.6, color: "rgb(244 244 245 / 0.7)" }}>
          Something broke badly enough that the page itself couldn&rsquo;t load. Reloading usually fixes it.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            border: "1px solid rgb(244 244 245 / 0.3)",
            borderRadius: "999px",
            padding: "0.9rem 1.8rem",
            fontSize: "13px",
            fontWeight: 500,
            color: "#f4f4f5",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
