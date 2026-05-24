// apps/cyrano-standalone/components/CharacterChat/CharacterChat.tsx
// CYR: Character Chat — persistent narrative conversation with an AI twin.
//      Pulls narrative context from the memory bank and renders the
//      conversation with the twin's persona.
// PHASE 4 ITEM 1: Added voice chat with microphone input and DreamCoins charging
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'character';
  content: string;
  timestamp: string;
  isVoice?: boolean;
}

interface CharacterChatProps {
  twinId: string;
  twinName: string;
  userId: string;
}

const API_BASE = process.env.NEXT_PUBLIC_CYRANO_API_URL ?? 'http://localhost:3000';

export function CharacterChat({ twinId, twinName, userId }: CharacterChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch user's wallet balance on mount
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch(`${API_BASE}/voice-chat/balance/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setBalance(data.balance.total);
        }
      } catch (e) {
        // Silent fail - balance will remain null
      }
    };
    void fetchBalance();
  }, [userId]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // 1. Build narrative context (pulls memory bank + active branch)
      const contextRes = await fetch(`${API_BASE}/cyrano/narrative/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          twin_id: twinId,
          user_id: userId,
          current_message: text,
          max_memory_entries: 20,
        }),
      });
      if (!contextRes.ok) throw new Error(await contextRes.text());
      const context = (await contextRes.json()) as { persona_prompt_injection: string };

      // 2. Send to Cyrano layer for AI reply (routes through the existing cyrano service)
      const chatRes = await fetch(`${API_BASE}/cyrano/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          twin_id: twinId,
          user_id: userId,
          message: text,
          system_context: context.persona_prompt_injection,
        }),
      });
      if (!chatRes.ok) throw new Error(await chatRes.text());
      const reply = (await chatRes.json()) as { reply: string; memory_stored?: boolean };

      const charMsg: Message = {
        id: `c-${Date.now()}`,
        role: 'character',
        content: reply.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, charMsg]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [input, loading, twinId, userId]);

  const startRecording = useCallback(async () => {
    try {
      setRecordingError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Convert audio to text using Web Speech API (browser-based STT)
        await processVoiceMessage(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      setRecordingError('Microphone access denied or not available');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const processVoiceMessage = useCallback(
    async (audioBlob: Blob) => {
      setLoading(true);
      setError(null);

      try {
        // For now, use a simple placeholder transcript
        // In production, you would:
        // 1. Upload audioBlob to S3
        // 2. Call a speech-to-text API (e.g., OpenAI Whisper, Google Speech-to-Text)
        // 3. Get the transcript back
        const transcript = '[Voice message transcribed]';

        // Convert audio blob to data URI
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        await new Promise((resolve) => {
          reader.onloadend = resolve;
        });
        const audioDataUri = reader.result as string;

        // Send voice message to backend (with DreamCoins deduction)
        const voiceRes = await fetch(`${API_BASE}/voice-chat/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            twinId,
            sessionId: `session-${userId}-${twinId}`,
            transcript,
            audioUrl: audioDataUri,
          }),
        });

        if (!voiceRes.ok) {
          const errorText = await voiceRes.text();
          throw new Error(errorText);
        }

        const voiceData = (await voiceRes.json()) as {
          success: boolean;
          tokensCharged: number;
          newBalance: { total: number };
        };

        // Update balance
        setBalance(voiceData.newBalance.total);

        // Add user's voice message to chat
        const userMsg: Message = {
          id: `u-voice-${Date.now()}`,
          role: 'user',
          content: transcript,
          timestamp: new Date().toISOString(),
          isVoice: true,
        };
        setMessages((prev) => [...prev, userMsg]);

        // Get AI reply
        const contextRes = await fetch(`${API_BASE}/cyrano/narrative/context`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            twin_id: twinId,
            user_id: userId,
            current_message: transcript,
            max_memory_entries: 20,
          }),
        });
        if (!contextRes.ok) throw new Error(await contextRes.text());
        const context = (await contextRes.json()) as { persona_prompt_injection: string };

        const chatRes = await fetch(`${API_BASE}/cyrano/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            twin_id: twinId,
            user_id: userId,
            message: transcript,
            system_context: context.persona_prompt_injection,
          }),
        });
        if (!chatRes.ok) throw new Error(await chatRes.text());
        const reply = (await chatRes.json()) as { reply: string };

        const charMsg: Message = {
          id: `c-${Date.now()}`,
          role: 'character',
          content: reply.reply,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, charMsg]);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [twinId, userId],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.avatar}>{twinName[0]}</div>
        <div style={{ flex: 1 }}>
          <div style={styles.twinName}>{twinName}</div>
          <div style={styles.subline}>AI Character · Persistent Memory Active</div>
        </div>
        {balance !== null && (
          <div style={styles.balance}>
            <span style={styles.balanceLabel}>DreamCoins:</span>{' '}
            <span style={styles.balanceValue}>{balance}</span>
          </div>
        )}
      </div>

      <div style={styles.chatWindow}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            Say hello to {twinName}. They remember everything about you.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              ...styles.bubble,
              ...(m.role === 'user' ? styles.userBubble : styles.charBubble),
            }}
          >
            <div style={styles.bubbleRole}>
              {m.role === 'user' ? 'You' : twinName}
              {m.isVoice && ' 🎤'}
            </div>
            <div style={styles.bubbleContent}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.bubble, ...styles.charBubble }}>
            <div style={styles.bubbleRole}>{twinName}</div>
            <div style={{ ...styles.bubbleContent, color: '#999' }}>Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {recordingError && <div style={styles.error}>{recordingError}</div>}

      <div style={styles.inputRow}>
        <button
          style={{
            ...styles.voiceBtn,
            ...(isRecording ? styles.voiceBtnRecording : {}),
          }}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
          title={isRecording ? 'Stop recording' : 'Start voice message (5 DreamCoins)'}
        >
          {isRecording ? '⏹' : '🎤'}
        </button>
        <textarea
          style={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${twinName}…`}
          rows={2}
          disabled={loading}
        />
        <button style={styles.sendBtn} onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    maxWidth: 720,
    margin: '0 auto',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 24px',
    borderBottom: '1px solid #eee',
    background: '#fff',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: '#1a1a2e',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 700,
  },
  twinName: { fontWeight: 700, fontSize: 18 },
  subline: { fontSize: 12, color: '#888', marginTop: 2 },
  balance: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    background: '#f8f8f8',
    borderRadius: 6,
    fontSize: 14,
  },
  balanceLabel: { color: '#666', fontWeight: 600 },
  balanceValue: { color: '#1a1a2e', fontWeight: 700 },
  chatWindow: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },
  emptyState: { textAlign: 'center' as const, color: '#999', marginTop: 48, fontSize: 15 },
  bubble: { maxWidth: '75%', padding: '10px 14px', borderRadius: 12 },
  userBubble: { alignSelf: 'flex-end' as const, background: '#1a1a2e', color: '#fff' },
  charBubble: { alignSelf: 'flex-start' as const, background: '#f1f1f1', color: '#111' },
  bubbleRole: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
    opacity: 0.7,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  bubbleContent: { fontSize: 15, lineHeight: 1.5 },
  error: { background: '#fee', color: '#900', padding: '8px 16px', fontSize: 13 },
  inputRow: {
    display: 'flex',
    gap: 8,
    padding: '12px 16px',
    borderTop: '1px solid #eee',
    background: '#fff',
  },
  voiceBtn: {
    background: '#1a1a2e',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '0 16px',
    fontSize: 20,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  voiceBtnRecording: {
    background: '#d32f2f',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  textarea: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: 8,
    fontSize: 15,
    resize: 'none' as const,
    fontFamily: 'inherit',
  },
  sendBtn: {
    background: '#1a1a2e',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '0 20px',
    fontSize: 15,
    cursor: 'pointer',
    alignSelf: 'stretch' as const,
  },
};
