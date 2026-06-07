import "./globals.css";

export const metadata = {
  title: "Excel Tutor — Finance Edition",
  description: "Practice-first Excel learning for finance professionals",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
