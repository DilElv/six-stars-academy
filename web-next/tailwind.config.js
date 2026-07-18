/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-oswald)", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        navy: {
          50: "#eef1f6",
          100: "#dfe5ee",
          200: "#c3ccdc",
          950: "#060e1a",
          900: "#0a1628",
          800: "#0f1f3a",
          700: "#132952",
          600: "#1a3870",
          500: "#234a91",
        },
        gold: {
          50: "#fbf4df",
          100: "#f6e7ba",
          300: "#f0d078",
          400: "#d4af37",
          500: "#c49a35",
          600: "#a8812a",
          700: "#b8960c",
        },
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "none" },
        },
        floodlight: {
          "0%, 100%": { opacity: "0.18" },
          "50%": { opacity: "0.34" },
        },
        flicker: {
          "0%, 88%, 100%": { opacity: "1" },
          "91%": { opacity: "0.86" },
          "94%": { opacity: "1" },
        },
        drawLine: {
          "0%": { strokeDashoffset: "440" },
          "100%": { strokeDashoffset: "0" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in": "scaleIn 0.7s cubic-bezier(0.16,1,0.3,1) both",
        floodlight: "floodlight 7s ease-in-out infinite",
        flicker: "flicker 5s ease-in-out infinite",
        "draw-line": "drawLine 1.4s cubic-bezier(0.16,1,0.3,1) forwards",
        marquee: "marquee 26s linear infinite",
      },
      boxShadow: {
        gold: "0 4px 16px rgba(212, 175, 55, 0.25)",
        "gold-lg": "0 6px 20px rgba(212, 175, 55, 0.35)",
      },
    },
  },
  plugins: [],
};
