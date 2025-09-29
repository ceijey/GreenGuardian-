import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ProtectedRoute from '@/components/ProtectedRoute';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Green Guardian",
  description: "Visualize Your Footprint, Swap Smart, and Create a Zero-Waste Future",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <ProtectedRoute>
            {children}
          </ProtectedRoute>
        </AuthProvider>
      </body>
    </html>
  );
}

export function SomeComponent() {
  const { user, logout } = useAuth();
  // Use auth functions and state
}
