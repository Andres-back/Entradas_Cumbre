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
  title: "Bajo el Capó | Hombres reales. Conversaciones reales. Vida real.",
  description:
    "Una charla entre hombres para hablar de lo que callamos. 20 de junio, 6 pm. Iglesia Cruzada Cristiana. Incluye cena.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
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
              background: "#0E1A2D",
              color: "#F5EDE0",
              border: "1px solid #1E2A3D",
              fontFamily: "var(--font-work-sans)",
            },
          }}
        />
      </body>
    </html>
  );
}
