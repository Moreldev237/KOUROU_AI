import { useCallback, useRef, useState } from "react";
import EventSource, { type EventSourceEvent } from "react-native-sse";

import { getAccessToken } from "@/api/tokenStorage";
import { API_BASE_URL } from "@/store/api/baseApi";

interface SendMessageParams {
  message: string;
  conversation?: string | null;
  exam?: number | null;
  subject?: number | null;
  topic?: number | null;
}

type TutorSSEEvent = "meta" | "message" | "done" | "error";

interface UseTutorStreamResult {
  streamingText: string;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (params: SendMessageParams) => void;
  stop: () => void;
}

/**
 * Consomme le flux SSE de POST /api/ai/tutor/chat/.
 *
 * On utilise `react-native-sse` plutôt que `fetch` + `ReadableStream` : le
 * support de ReadableStream sur le moteur Hermes reste inégal selon les
 * versions, alors que `react-native-sse` s'appuie sur XMLHttpRequest (stable
 * partout) et supporte nativement POST + headers + body, ce dont EventSource
 * natif du navigateur est incapable (il ne fait que du GET).
 *
 * Événements émis par le backend, dans l'ordre (voir apps/ai_engine/views.py) :
 *   meta    -> {"conversation_id": "...", "is_new": bool}   (une fois, au début)
 *   message -> fragment de texte BRUT (pas du JSON)          (plusieurs fois)
 *   done    -> (vide)                                        (une fois, à la fin)
 *   error   -> message d'erreur texte                        (si échec du moteur IA)
 */
export function useTutorStream(onDone?: (fullText: string, conversationId: string | null) => void): UseTutorStreamResult {
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource<TutorSSEEvent> | null>(null);

  const stop = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    (params: SendMessageParams) => {
      setError(null);
      setStreamingText("");
      setIsStreaming(true);

      // Variables locales (pas du state React) pour éviter tout problème de
      // closure périmée entre les écouteurs "meta" et "done" du même flux.
      let buffer = "";
      let localConversationId: string | null = params.conversation ?? null;

      (async () => {
        const token = await getAccessToken();

        const es = new EventSource<TutorSSEEvent>(`${API_BASE_URL}/api/ai/tutor/chat/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: params.message,
            conversation: params.conversation ?? undefined,
            exam: params.exam ?? undefined,
            subject: params.subject ?? undefined,
            topic: params.topic ?? undefined,
          }),
          pollingInterval: 0, // réponse à usage unique : pas de reconnexion automatique
        });
        esRef.current = es;

        es.addEventListener("meta", (event: EventSourceEvent<"meta">) => {
          try {
            const data = JSON.parse(event.data ?? "{}");
            localConversationId = data.conversation_id ?? localConversationId;
          } catch {
            // meta malformé : le flux continue quand même sur le texte.
          }
        });

        es.addEventListener("message", (event: EventSourceEvent<"message">) => {
          buffer += event.data ?? "";
          setStreamingText(buffer);
        });

        es.addEventListener("error", (event: EventSourceEvent<"error"> | any) => {
          setError(event?.data || "Le tuteur IA est momentanément indisponible. Réessayez.");
          setIsStreaming(false);
          es.close();
        });

        es.addEventListener("done", () => {
          setIsStreaming(false);
          es.close();
          onDone?.(buffer, localConversationId);
        });
      })();
    },
    [onDone]
  );

  return { streamingText, isStreaming, error, sendMessage, stop };
}
