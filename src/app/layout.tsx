import type { Metadata } from "next";
import { Inter, Urbanist } from "next/font/google";
import "./globals.css";
import "./print.css";
import ConditionalLayout from "@/components/layout/ConditionalLayout";
import { Providers } from "@/components/providers/Providers";
import { Toaster } from "@/components/design-system";
import Script from "next/script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "JACXI Shipping - Vehicle Shipping from USA to Afghanistan via UAE",
  description: "Professional vehicle shipping from USA through Dubai UAE to Herat and all Afghan provinces. Complete door-to-door service with customs clearance, insurance, and tracking. Serving Kabul, Kandahar, Mazar-i-Sharif and more.",
  keywords: "vehicle shipping USA to Afghanistan, car shipping to Herat, USA to UAE to Afghanistan, vehicle transport Kabul, Jacxi Shipping, Afghanistan car import",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${urbanist.variable}`} dir="ltr">
      <body className="min-h-screen bg-background antialiased" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
          <Script id="ux-sniff" strategy="afterInteractive">
            {`(function(u,x,s,n,i,f){
  u.ux=u.ux||function(){(u.ux.q=u.ux.q||[]).push(arguments)};
  i=x.getElementsByTagName('head')[0]; f=x.createElement('script');f.async=1; f.src=s+n;
  i.appendChild(f);
})(window,document,'https://api.uxsniff.com/cdn/js/uxsnf_track','.js');`}
          </Script>
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
