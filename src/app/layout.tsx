import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jbmono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ecosme.id"),
  title: {
    default: "EcoSME — Smart Energy & Green Finance Platform untuk IKM",
    template: "%s · EcoSME",
  },
  description:
    "EcoSME membantu IKM memantau penggunaan listrik per mesin, mengoptimalkan biaya energi, mengukur penghematan dengan baseline terdokumentasi, dan menyiapkan data pendukung pembiayaan hijau.",
  applicationName: "EcoSME",
  keywords: ["IoT energi", "IKM", "efisiensi energi", "pembiayaan hijau", "monitoring listrik", "green finance", "M&V"],
  openGraph: {
    title: "EcoSME — Smart Energy. Measurable Savings. Smarter Green Financing.",
    description: "Pantau Energi, Optimalkan Biaya, Siapkan Pembiayaan Hijau.",
    type: "website",
    locale: "id_ID",
  },
};

export const viewport: Viewport = {
  themeColor: "#123B2A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${jakarta.variable} ${jbmono.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
