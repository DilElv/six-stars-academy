/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          950: "#060e1a",
          900: "#0a1628",
          800: "#0f1f3a",
          700: "#132952",
          600: "#1a3870",
          500: "#234a91",
        },
        gold: {
          300: "#f0d078",
          400: "#d4a843",
          500: "#c49a35",
          600: "#a8812a",
        },
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
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
    },
  },
  plugins: [],
};
