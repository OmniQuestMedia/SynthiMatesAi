// apps/shared-ui/components/AutoAdvanceIndicator.tsx
// Auto-Advance listening indicator — shared across both Whisper portals

export interface AutoAdvanceIndicatorProps {
  isListening: boolean;
  confidence: number; // 0-100
  nextLineReady: boolean;
}

export function AutoAdvanceIndicator({
  isListening,
  confidence,
  nextLineReady,
}: AutoAdvanceIndicatorProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
      {/* Listening Status */}
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
          }`}
        />
        <span className="text-sm text-gray-300">{isListening ? 'Listening...' : 'Standby'}</span>
      </div>

      {/* Confidence Meter */}
      {isListening && (
        <div className="flex-1 max-w-xs">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 mt-1">Confidence: {confidence}%</span>
        </div>
      )}

      {/* Next Line Ready */}
      {nextLineReady && (
        <span className="text-sm text-green-400 font-semibold animate-pulse">
          ✓ Next line ready
        </span>
      )}
    </div>
  );
}
