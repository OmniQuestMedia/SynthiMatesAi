// apps/shared-ui/components/WhisperPanel.tsx
// Shared Whisper UI component — 95%+ code reuse between SythiMateWhisper™ and CyranoWhisper
import { useState } from 'react';

export interface WhisperSuggestion {
  id: string;
  text: string;
  category: string;
  priority: number;
}

export interface WhisperPanelProps {
  suggestions: WhisperSuggestion[];
  onSelectSuggestion: (id: string) => void;
  autoAdvanceEnabled: boolean;
  virtualPickleEnabled: boolean;
  teleprompterMode: boolean;
  rating: 'G' | '14+' | '18+' | 'XXX';
}

export function WhisperPanel({
  suggestions,
  onSelectSuggestion,
  autoAdvanceEnabled,
  virtualPickleEnabled,
  teleprompterMode,
  rating,
}: WhisperPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="whisper-panel flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Whisper Suggestions</h2>
        <div className="flex gap-2 mt-2">
          <span className="text-xs px-2 py-1 bg-blue-600 rounded">
            Auto-Advance: {autoAdvanceEnabled ? 'ON' : 'OFF'}
          </span>
          {virtualPickleEnabled && (
            <span className="text-xs px-2 py-1 bg-green-600 rounded">Virtual Pickle Active</span>
          )}
          {teleprompterMode && (
            <span className="text-xs px-2 py-1 bg-purple-600 rounded">Teleprompter Mode</span>
          )}
          <span className="text-xs px-2 py-1 bg-gray-700 rounded">Rating: {rating}</span>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {suggestions.length === 0 ? (
          <p className="text-gray-400 text-center mt-8">
            No suggestions yet. Start your session to receive AI guidance.
          </p>
        ) : (
          suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                index === selectedIndex ? 'bg-blue-600 scale-105' : 'bg-gray-800 hover:bg-gray-700'
              }`}
              onClick={() => {
                setSelectedIndex(index);
                onSelectSuggestion(suggestion.id);
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-blue-300">{suggestion.category}</span>
                <span className="text-xs text-gray-400">Priority: {suggestion.priority}</span>
              </div>
              <p className={teleprompterMode ? 'text-2xl font-bold' : 'text-base'}>
                {suggestion.text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Virtual Pickle Controller (bottom section) */}
      {virtualPickleEnabled && (
        <div className="p-4 border-t border-gray-700 bg-gray-950">
          <div className="grid grid-cols-3 gap-2">
            <button
              className="py-3 px-4 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
            >
              ← Prev
            </button>
            <button
              className="py-3 px-4 bg-green-600 rounded-lg hover:bg-green-700 transition"
              onClick={() => onSelectSuggestion(suggestions[selectedIndex]?.id)}
            >
              Use
            </button>
            <button
              className="py-3 px-4 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              onClick={() => setSelectedIndex(Math.min(suggestions.length - 1, selectedIndex + 1))}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
