import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0D1117",
        surface: "#151B23",
        surface2: "#1C232D",
        border: "#232B36",
        text: "#DCE1E8",
        muted: "#8A93A3",
        signal: {
          low: "#3FA796",
          mid: "#E8A33D",
          high: "#E8A33D",
          critical: "#D6524A",
        },
        danger: "#D6524A",
        success: "#3FA796",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "'SF Mono'", "Menlo", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset",
      },
    },
  },
  plugins: [],
};
export default config;
