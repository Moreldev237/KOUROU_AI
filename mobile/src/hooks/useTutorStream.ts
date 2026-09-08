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
  documents?: { name: string; content: string; encoding?: "base64" }[];
  language?: "fr" | "en";
}

type TutorSSEEvent = "meta" | "message" | "done" | "error";

interface UseTutorStreamResult {
  streamingText: string;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (params: SendMessageParams) => void;
  stop: () => void;
  retry: () => void;
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
  const lastParamsRef = useRef<SendMessageParams | null>(null);

  const stop = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    (params: SendMessageParams) => {
      lastParamsRef.current = params;
      setError(null);
      setStreamingText("");
      setIsStreaming(true);

      // Variables locales (pas du state React) pour éviter tout problème de
      // closure périmée entre les écouteurs "meta" et "done" du même flux.
      let buffer = "";
      let localConversationId: string | null = params.conversation ?? null;

      (async () => {
        try {
          const token = await getAccessToken();
          if (!token) {
            setError("Votre session a expiré. Reconnectez-vous pour utiliser Kourou AI.");
            setIsStreaming(false);
            return;
          }

          const es = new EventSource<TutorSSEEvent>(`${API_BASE_URL}/api/ai/tutor/chat/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: params.message,
            conversation: params.conversation ?? undefined,
            exam: params.exam ?? undefined,
            subject: params.subject ?? undefined,
            topic: params.topic ?? undefined,
            documents: params.documents ?? undefined,
            language: params.language ?? "fr",
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
            const status = event?.status ?? event?.statusCode;
            const detail = typeof event?.data === "string" && event.data.trim() ? event.data.trim() : "";
            const message = status === 429
              ? "Trop de demandes en peu de temps. La limite est de 20 messages par minute. Patientez une minute avant de réessayer."
              : status === 401
                ? "Votre session a expiré. Reconnectez-vous pour utiliser Kourou AI."
                : status === 429
                  ? "Votre quota de messages journaliers est épuisé. Réessayez demain ou souscrivez un abonnement."
                  : status === 502
                    ? "Le moteur IA est momentanément indisponible. Réessayez dans quelques instants."
                    : detail || "La connexion avec Kourou AI a été interrompue. Vérifiez votre connexion puis réessayez.";
            setError(message);
            setIsStreaming(false);
            es.close();
          });

          es.addEventListener("done", () => {
            setIsStreaming(false);
            es.close();
            onDone?.(buffer, localConversationId);
          });
        } catch {
          setError("Impossible de joindre Kourou AI. Vérifiez votre connexion puis réessayez.");
          setIsStreaming(false);
        }
      })();
    },
    [onDone]
  );

  const retry = useCallback(() => {
    if (lastParamsRef.current) sendMessage(lastParamsRef.current);
  }, [sendMessage]);

  return { streamingText, isStreaming, error, sendMessage, stop, retry };
}
