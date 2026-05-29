// apps/portals/synthimate-whisper/app/page.tsx
// SynthimateWhisper™ Portal — Adult flagship whisper companion
import type { Metadata } from 'next';
import { getTheme, getPortalDescription, getPortalKeywords } from '@cyrano/shared-ui';

const PORTAL = 'SYNTHIMATE_WHISPER';
const PORTAL_SLUG = 'synthimate-whisper';

export async function generateMetadata(): Promise<Metadata> {
  const theme = getTheme(PORTAL);
  return {
    title: `${theme.name} - AI Whisper Companion for Adult Creators`,
    description: getPortalDescription(PORTAL_SLUG),
    keywords: getPortalKeywords(PORTAL_SLUG).join(', '),
    openGraph: {
      title: `${theme.name} - AI Whisper Companion`,
      description: getPortalDescription(PORTAL_SLUG),
      images: [{ url: `/og-image-whisper.jpg` }],
    },
  };
}

export default function SynthimateWhisperPortalPage() {
  const theme = getTheme(PORTAL);
  return (
    <main
      style={{ background: theme.background, minHeight: '100vh' }}
      className="flex flex-col items-center justify-center px-6 text-center"
    >
      <h1 style={{ color: theme.primary }} className="text-5xl font-extrabold mb-4">
        {theme.name}
      </h1>
      <p style={{ color: theme.accent }} className="text-xl mb-8 max-w-xl">
        {theme.tagline}
      </p>
      <div className="flex gap-4">
        <a
          href="/signup"
          style={{ background: theme.primary }}
          className="px-8 py-4 rounded-2xl text-white text-lg font-semibold shadow-lg hover:opacity-90 transition-opacity"
        >
          Start Broadcasting
        </a>
        <a
          href="/features"
          style={{ borderColor: theme.accent, color: theme.accent }}
          className="px-8 py-4 rounded-2xl border-2 text-lg font-semibold hover:opacity-80 transition-opacity"
        >
          See Features
        </a>
      </div>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        <div className="p-6 bg-white bg-opacity-10 rounded-xl">
          <h3 className="text-lg font-bold mb-2" style={{ color: theme.accent }}>
            Virtual Pickle
          </h3>
          <p className="text-sm text-gray-300">
            Bottom-screen controller for seamless broadcast control
          </p>
        </div>
        <div className="p-6 bg-white bg-opacity-10 rounded-xl">
          <h3 className="text-lg font-bold mb-2" style={{ color: theme.accent }}>
            Auto-Advance
          </h3>
          <p className="text-sm text-gray-300">
            Intelligent listening that delivers your next line at the perfect moment
          </p>
        </div>
        <div className="p-6 bg-white bg-opacity-10 rounded-xl">
          <h3 className="text-lg font-bold mb-2" style={{ color: theme.accent }}>
            Broadcast Overlay
          </h3>
          <p className="text-sm text-gray-300">
            Browser extension that ingests chat from Chaturbate, Stripchat, and more
          </p>
        </div>
      </div>
    </main>
  );
}
