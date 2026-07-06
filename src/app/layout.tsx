import type { Metadata } from "next";
import { Alfa_Slab_One, Oswald, Work_Sans, Special_Elite } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const alfaSlabOne = Alfa_Slab_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-alfa-slab-one",
  display: "swap",
});

const oswald = Oswald({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
});

const workSans = Work_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
});

const specialElite = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-special-elite",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cumbre Impacto Putumayo 2026 | Mocoa",
  description: "Cumbre Impacto Putumayo 2026. Sembrando y cosechando juntos. 10 y 11 de julio de 2026 en Mocoa, Putumayo. Aporte de inscripción: $45.000 COP, incluye materiales y alimentación.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-CO"
      className={`${alfaSlabOne.variable} ${oswald.variable} ${workSans.variable} ${specialElite.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col font-body">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-ember-bright focus:text-taller-night focus:rounded focus:font-subhead focus:text-lg">
          Ir al contenido principal
        </a>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#03172A",
              color: "#FFFFFF",
              border: "1px solid #073B5C",
              fontFamily: "var(--font-work-sans)",
            },
          }}
        />
      </body>
    </html>
  );
}



