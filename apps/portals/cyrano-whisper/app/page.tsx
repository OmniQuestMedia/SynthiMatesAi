// apps/portals/cyrano-whisper/app/page.tsx
// CyranoWhisper Portal — Mainstream whisper companion
import type { Metadata } from 'next';
import { getTheme, getPortalDescription, getPortalKeywords } from '@cyrano/shared-ui';

const PORTAL = 'CYRANO_WHISPER';
const PORTAL_SLUG = 'cyrano-whisper';

export async function generateMetadata(): Promise<Metadata> {
  const theme = getTheme(PORTAL);
  return {
    title: `${theme.name} - AI Whisper Coach for Life`,
    description: getPortalDescription(PORTAL_SLUG),
    keywords: getPortalKeywords(PORTAL_SLUG).join(', '),
    openGraph: {
      title: `${theme.name} - AI Whisper Coach`,
      description: getPortalDescription(PORTAL_SLUG),
      images: [{ url: `/og-image-cyrano-whisper.jpg` }],
    },
  };
}

export default function CyranoWhisperPortalPage() {
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
          Get Started
        </a>
        <a
          href="/features"
          style={{ borderColor: theme.accent, color: theme.accent }}
          className="px-8 py-4 rounded-2xl border-2 text-lg font-semibold hover:opacity-80 transition-opacity"
        >
          Explore Features
        </a>
      </div>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl">
        <div className="p-6 bg-white bg-opacity-10 rounded-xl">
          <h3 className="text-lg font-bold mb-2" style={{ color: theme.accent }}>
            Dating Coach
          </h3>
          <p className="text-sm text-gray-300">
            Real-time conversation guidance for your next date
          </p>
        </div>
        <div className="p-6 bg-white bg-opacity-10 rounded-xl">
          <h3 className="text-lg font-bold mb-2" style={{ color: theme.accent }}>
            Public Speaking
          </h3>
          <p className="text-sm text-gray-300">Teleprompter mode for presentations and speeches</p>
        </div>
        <div className="p-6 bg-white bg-opacity-10 rounded-xl">
          <h3 className="text-lg font-bold mb-2" style={{ color: theme.accent }}>
            Language Learning
          </h3>
          <p className="text-sm text-gray-300">Practice conversations with intelligent feedback</p>
        </div>
        <div className="p-6 bg-white bg-opacity-10 rounded-xl">
          <h3 className="text-lg font-bold mb-2" style={{ color: theme.accent }}>
            Acting Coach
          </h3>
          <p className="text-sm text-gray-300">Line delivery and scene practice with AI guidance</p>
        </div>
      </div>
    </main>
  );
}
