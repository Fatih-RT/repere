/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        canvas: "var(--canvas)",
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        text: "var(--text)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        border: "var(--border)",
        border2: "var(--border2)",
        track: "var(--track)",
        hover: "var(--hover)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-soft2": "var(--accent-soft2)",
        "accent-line": "var(--accent-line)",
        ok: "var(--ok)",
        warn: "var(--warn)",
        err: "var(--err)",
        "err-line": "var(--err-line)",
        "err-soft": "var(--err-soft)",
      },
      borderRadius: {
        sm: "7px",
        DEFAULT: "9px",
        md: "10px",
        lg: "12px",
        xl: "14px",
        "2xl": "16px",
      },
      boxShadow: {
        card: "var(--shadow)",
      },
      keyframes: {
        rise: { from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "none" } },
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
      },
      animation: {
        rise: "rise .35s ease both",
        fade: "fade .3s ease both",
      },
    },
  },
  plugins: [],
};
