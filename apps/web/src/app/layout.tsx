import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RepoMentor AI — Codebase Architecture & Technical Mentor',
  description:
    'Deep code intelligence, AST dependency analysis, architecture visualization, and interactive AI mentoring for software repositories.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-workspace-950 text-slate-100 min-h-screen flex flex-col selection:bg-sky-500/30 selection:text-sky-200">
        {children}
      </body>
    </html>
  );
}
