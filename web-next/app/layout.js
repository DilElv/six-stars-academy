import localFont from "next/font/local";
import { Outfit, Oswald } from "next/font/google";
import "./globals.css";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});
const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata = {
  title: "SixStars Academy Indonesia",
  description: "Akademi sepak bola profesional untuk usia dini",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${oswald.variable} antialiased`}
      >
        {children}
        <WhatsAppFloatingButton />
      </body>
    </html>
  );
}
