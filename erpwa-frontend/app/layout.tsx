import type React from "react";
import type { Metadata } from "next";

import { ThemeProvider } from "@/context/theme-provider";
import { AuthProvider } from "@/context/authContext";
import { ToastContainer } from "react-toastify";
import { UploadProvider } from "@/context/GlobalUploadContext";
import "react-toastify/dist/ReactToastify.css";

import "./globals.css";

export const metadata: Metadata = {
  title: "ERPWA",
  description: "Enterprise Resource Planning & WhatsApp Automation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <UploadProvider>{children}</UploadProvider>
          </AuthProvider>

          {/* ✅ Global Toast Container (theme-aware) */}
          <ToastContainer
            position="top-center"
            autoClose={6000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
            toastClassName="toast-base"
            progressClassName="toast-progress"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
