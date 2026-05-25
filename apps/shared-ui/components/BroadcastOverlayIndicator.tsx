// apps/shared-ui/components/BroadcastOverlayIndicator.tsx
// Broadcast platform overlay status — SynthiMateWhisper™ only

export interface BroadcastPlatform {
  name: string;
  connected: boolean;
  chatMessageCount: number;
}

export interface BroadcastOverlayIndicatorProps {
  platforms: BroadcastPlatform[];
  extensionInstalled: boolean;
}

export function BroadcastOverlayIndicator({
  platforms,
  extensionInstalled,
}: BroadcastOverlayIndicatorProps) {
  if (!extensionInstalled) {
    return (
      <div className="p-4 bg-yellow-900 bg-opacity-50 rounded-lg border border-yellow-600">
        <p className="text-yellow-200 text-sm mb-2">⚠️ Broadcast Overlay Extension Not Detected</p>
        <a
          href="/install-extension"
          className="text-xs text-blue-300 underline hover:text-blue-200"
        >
          Install Chrome/Edge Extension →
        </a>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Broadcast Platform Connections</h3>
      <div className="space-y-2">
        {platforms.map((platform) => (
          <div key={platform.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  platform.connected ? 'bg-green-500' : 'bg-gray-500'
                }`}
              />
              <span className="text-sm text-gray-200">{platform.name}</span>
            </div>
            {platform.connected && (
              <span className="text-xs text-gray-400">{platform.chatMessageCount} messages</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
