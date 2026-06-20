"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface TranscriptMessage {
  role: "agente" | "prospecto";
  text: string;
}

export interface AudioRecording {
  userAudio: Float32Array;
  aiAudio: Float32Array;
  sampleRate: number;
  duration: number;
}

const WS_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_AI_AGENT_WS_URL || "ws://localhost:8000/simulate/live"
    : "";

// ── Resampleo de mejor calidad ──────────────────────────────────────────

/**
 * Downsample 48kHz Float32 → 16kHz Int16 con filtro de promedio móvil.
 * En vez de tomar 1 de cada 3 muestras (aliasing), promedia una ventana.
 */
function downsampleFloat32ToInt16(
  input: Float32Array,
  inputRate: number,
  outputRate: number
): Int16Array {
  const ratio = inputRate / outputRate; // 3.0 para 48→16
  const outputLength = Math.floor(input.length / ratio);
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const start = i * ratio;
    const end = start + ratio;
    let sum = 0;
    let count = 0;
    for (let j = Math.floor(start); j < Math.ceil(end) && j < input.length; j++) {
      sum += input[j];
      count++;
    }
    const avg = count > 0 ? sum / count : 0;
    const s = Math.max(-1, Math.min(1, avg));
    output[i] = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
  }
  return output;
}

/**
 * Upsample 24kHz Int16 → 48kHz Float32 con interpolación lineal.
 */
function upsampleInt16ToFloat32(
  input: Int16Array,
  inputRate: number,
  outputRate: number
): Float32Array {
  const ratio = outputRate / inputRate; // 2.0 para 24→48
  const outputLength = Math.floor(input.length * ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIdx = i / ratio;
    const idx0 = Math.floor(srcIdx);
    const idx1 = Math.min(idx0 + 1, input.length - 1);
    const frac = srcIdx - idx0;
    const s0 = input[idx0] / 32768;
    const s1 = input[idx1] / 32768;
    output[i] = s0 + (s1 - s0) * frac;
  }
  return output;
}

// ── WAV encoder ─────────────────────────────────────────────────────────

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function floatToInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const int16 = floatToInt16(samples);
  const buffer = new ArrayBuffer(44 + int16.length * 2);
  const view = new DataView(buffer);

  // RIFF chunk
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + int16.length * 2, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, int16.length * 2, true);
  for (let i = 0; i < int16.length; i++) {
    view.setInt16(44 + i * 2, int16[i], true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function useLiveAudioSimulation() {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [recording, setRecording] = useState<AudioRecording | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micNodeRef = useRef<ScriptProcessorNode | null>(null);
  const playbackNodeRef = useRef<ScriptProcessorNode | null>(null);
  const playbackBufferRef = useRef<Float32Array[]>([]);
  const isActiveRef = useRef(false);
  const userSpeakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Buffers de grabación
  const userAudioBufferRef = useRef<Float32Array[]>([]);
  const aiAudioBufferRef = useRef<Float32Array[]>([]);

  const stop = useCallback(() => {
    const duration = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
    isActiveRef.current = false;

    if (micNodeRef.current) {
      micNodeRef.current.disconnect();
      micNodeRef.current = null;
    }
    if (playbackNodeRef.current) {
      playbackNodeRef.current.disconnect();
      playbackNodeRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ type: "stop" }));
      } catch {}
      wsRef.current.close();
      wsRef.current = null;
    }
    playbackBufferRef.current = [];

    // Guardar grabación
    const userChunks = userAudioBufferRef.current;
    const aiChunks = aiAudioBufferRef.current;
    if (userChunks.length > 0 || aiChunks.length > 0) {
      const totalUser = userChunks.reduce((sum, c) => sum + c.length, 0);
      const totalAI = aiChunks.reduce((sum, c) => sum + c.length, 0);
      const userAudio = new Float32Array(totalUser);
      const aiAudio = new Float32Array(totalAI);
      let off = 0;
      for (const c of userChunks) {
        userAudio.set(c, off);
        off += c.length;
      }
      off = 0;
      for (const c of aiChunks) {
        aiAudio.set(c, off);
        off += c.length;
      }
      setRecording({ userAudio, aiAudio, sampleRate: 48000, duration });
    }

    userAudioBufferRef.current = [];
    aiAudioBufferRef.current = [];

    setStatus("idle");
    setIsAISpeaking(false);
    setIsUserSpeaking(false);
  }, []);

  const downloadWav = useCallback(
    (which: "user" | "ai" | "both") => {
      if (!recording) return;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      if (which === "user" || which === "both") {
        const blob = encodeWav(recording.userAudio, recording.sampleRate);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `simulacion-usuario-${timestamp}.wav`;
        a.click();
        URL.revokeObjectURL(url);
      }

      if (which === "ai" || which === "both") {
        const blob = encodeWav(recording.aiAudio, recording.sampleRate);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `simulacion-ia-${timestamp}.wav`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [recording]
  );

  const start = useCallback(
    async (params: { softwareId: string; leadId: string; spechId?: string }) => {
      if (isActiveRef.current) {
        stop();
      }

      setStatus("connecting");
      setError(null);
      setTranscripts([]);
      setRecording(null);
      isActiveRef.current = true;
      startTimeRef.current = Date.now();
      userAudioBufferRef.current = [];
      aiAudioBufferRef.current = [];

      try {
        // --- 1. Conectar WebSocket ---
        const ws = new WebSocket(WS_URL);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        await new Promise<void>((resolve, reject) => {
          ws.onopen = () => resolve();
          ws.onerror = () => reject(new Error("WebSocket error"));
          ws.onclose = () => reject(new Error("WebSocket cerrado"));
          setTimeout(() => reject(new Error("Timeout conectando WebSocket")), 10000);
        });

        ws.onclose = () => {
          if (isActiveRef.current) {
            setStatus("error");
            setError("Conexion cerrada");
            stop();
          }
        };

        ws.onerror = () => {
          setError("Error de conexion");
          setStatus("error");
        };

        // --- 2. Configurar AudioContext ---
        const audioCtx = new AudioContext({ sampleRate: 48000 });
        audioCtxRef.current = audioCtx;
        const sampleRate = audioCtx.sampleRate;

        // --- 3. Captura de micrófono ---
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
          },
        });

        const micSource = audioCtx.createMediaStreamSource(stream);
        const micNode = audioCtx.createScriptProcessor(4096, 1, 1);
        micNodeRef.current = micNode;

        micNode.onaudioprocess = (e) => {
          if (!isActiveRef.current || ws.readyState !== WebSocket.OPEN) return;

          const inputData = e.inputBuffer.getChannelData(0);

          // Grabar audio del usuario
          const userCopy = new Float32Array(inputData);
          userAudioBufferRef.current.push(userCopy);

          // Detectar si el usuario está hablando (RMS simple)
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          if (rms > 0.01) {
            setIsUserSpeaking(true);
            if (userSpeakingTimeoutRef.current) {
              clearTimeout(userSpeakingTimeoutRef.current);
            }
            userSpeakingTimeoutRef.current = setTimeout(() => {
              setIsUserSpeaking(false);
            }, 500);
          }

          // Downsample 48kHz → 16kHz y convertir a Int16
          const int16Data = downsampleFloat32ToInt16(inputData, sampleRate, 16000);
          ws.send(int16Data.buffer);
        };

        micSource.connect(micNode);
        // NO conectar micNode a destination — evita feedback
        // micNode.connect(audioCtx.destination);

        // --- 4. Reproducción de audio (sink) ---
        const playbackNode = audioCtx.createScriptProcessor(4096, 1, 1);
        playbackNodeRef.current = playbackNode;

        // Pre-buffer: esperar a tener ~200ms de audio antes de reproducir
        const prebufferSamples = Math.floor((sampleRate * 0.2) / 4096) * 4096;
        let totalBuffered = 0;

        playbackNode.onaudioprocess = (e) => {
          const outputData = e.outputBuffer.getChannelData(0);
          const needed = outputData.length;
          let written = 0;

          // Pre-buffer check
          if (totalBuffered < prebufferSamples) {
            totalBuffered += playbackBufferRef.current.reduce((s, c) => s + c.length, 0);
            if (totalBuffered < prebufferSamples) {
              // Silencio mientras acumulamos
              outputData.fill(0);
              return;
            }
          }

          while (written < needed && playbackBufferRef.current.length > 0) {
            const chunk = playbackBufferRef.current[0];
            const toCopy = Math.min(chunk.length, needed - written);
            outputData.set(chunk.subarray(0, toCopy), written);
            if (toCopy < chunk.length) {
              playbackBufferRef.current[0] = chunk.subarray(toCopy);
            } else {
              playbackBufferRef.current.shift();
            }
            written += toCopy;
          }

          for (let i = written; i < needed; i++) {
            outputData[i] = 0;
          }

          // Grabar audio de la IA (lo que se reproduce)
          if (written > 0) {
            const played = outputData.slice(0, written);
            aiAudioBufferRef.current.push(new Float32Array(played));
          }

          const hasAudio = playbackBufferRef.current.length > 0;
          setIsAISpeaking(hasAudio || written > 0);
        };

        // Conectar playback a salida
        playbackNode.connect(audioCtx.destination);

        // --- 5. Manejar mensajes del servidor ---
        ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            // Audio binario de Gemini (PCM 24kHz Int16)
            const int16Data = new Int16Array(event.data);
            const float32Data = upsampleInt16ToFloat32(int16Data, 24000, sampleRate);
            playbackBufferRef.current.push(float32Data);
            setIsAISpeaking(true);
          } else {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === "status" && msg.status === "connected") {
                setStatus("connected");
              } else if (msg.type === "transcript") {
                setTranscripts((prev) => [...prev, { role: msg.role, text: msg.text }]);
              } else if (msg.type === "interrupt") {
                playbackBufferRef.current = [];
                setIsAISpeaking(false);
              } else if (msg.type === "error") {
                setError(msg.message);
                setStatus("error");
              }
            } catch {
              // ignorar
            }
          }
        };

        // --- 6. Enviar mensaje de inicio ---
        ws.send(
          JSON.stringify({
            type: "start",
            softwareId: params.softwareId,
            leadId: params.leadId,
            spechId: params.spechId || "",
          })
        );
      } catch (e: any) {
        setError(e.message || "Error iniciando simulacion");
        setStatus("error");
        stop();
      }
    },
    [stop]
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    status,
    error,
    transcripts,
    isAISpeaking,
    isUserSpeaking,
    recording,
    start,
    stop,
    downloadWav,
  };
}
