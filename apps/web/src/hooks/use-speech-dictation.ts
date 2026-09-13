"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechDictation(options?: {
  lang?: string;
  onFinalTranscript?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  onUnsupported?: () => void;
  onError?: (message: string) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldListenRef = useRef(false);

  const onFinalRef = useRef(options?.onFinalTranscript);
  const onInterimRef = useRef(options?.onInterimTranscript);
  const onUnsupportedRef = useRef(options?.onUnsupported);
  const onErrorRef = useRef(options?.onError);

  useEffect(() => {
    onFinalRef.current = options?.onFinalTranscript;
    onInterimRef.current = options?.onInterimTranscript;
    onUnsupportedRef.current = options?.onUnsupported;
    onErrorRef.current = options?.onError;
  });

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    setSupported(Boolean(Ctor));
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = options?.lang ?? "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) finalChunk += transcript;
        else interim += transcript;
      }
      if (finalChunk.trim()) onFinalRef.current?.(finalChunk.trim());
      if (interim.trim()) onInterimRef.current?.(interim.trim());
    };

    recognition.onerror = (event) => {
      const code = event.error ?? "unknown";
      if (code === "aborted" || code === "no-speech") return;
      shouldListenRef.current = false;
      setListening(false);
      onErrorRef.current?.(
        code === "not-allowed"
          ? "Microphone permission denied"
          : `Voice input error: ${code}`,
      );
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          shouldListenRef.current = false;
        }
      }
      setListening(false);
    };

    recognitionRef.current = recognition;
    return () => {
      shouldListenRef.current = false;
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();
      } catch {
        // ignore teardown errors
      }
      recognitionRef.current = null;
    };
  }, [options?.lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      onUnsupportedRef.current?.();
      return;
    }
    shouldListenRef.current = true;
    setListening(true);
    try {
      recognition.start();
    } catch {
      // Already started
    }
  }, []);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    setListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, start, stop, toggle };
}
