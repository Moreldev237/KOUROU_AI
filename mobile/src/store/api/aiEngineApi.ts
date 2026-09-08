import { baseApi } from "@/store/api/baseApi";
import type {
  Difficulty,
  QCMSession,
  QCMSessionListItem,
  SessionMode,
  SubmitAnswerResult,
  TutorConversation,
  TutorMessage,
} from "@/types";

interface GenerateQCMRequest {
  exam: number;
  subject: number;
  topic?: number | null;
  mode?: SessionMode;
  difficulty?: Difficulty;
  question_count?: number;
  language?: "fr" | "en";
}

interface SubmitAnswerRequest {
  question: number;
  selected_choice_key: string;
}

export const aiEngineApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    generateQCM: builder.mutation<QCMSession, GenerateQCMRequest>({
      query: (body) => ({ url: "/ai/qcm/generate/", method: "POST", body }),
      invalidatesTags: ["Quota", "QCMSession"],
    }),

    submitAnswer: builder.mutation<SubmitAnswerResult, SubmitAnswerRequest>({
      query: (body) => ({ url: "/ai/qcm/answer/", method: "POST", body }),
      invalidatesTags: [{ type: "QCMSession", id: "CURRENT" }, "QCMSession"],
    }),

    getQCMSession: builder.query<QCMSession, string>({
      query: (id) => `/ai/qcm/sessions/${id}/`,
      providesTags: (_result, _err, id) => [{ type: "QCMSession", id }, { type: "QCMSession", id: "CURRENT" }],
    }),

    deleteQCMSession: builder.mutation<void, string>({
      query: (id) => ({ url: `/ai/qcm/sessions/${id}/`, method: "DELETE" }),
      invalidatesTags: ["QCMSession"],
    }),

    getQCMHistory: builder.query<{ results: QCMSessionListItem[] }, void>({
      query: () => "/ai/qcm/history/",
      providesTags: ["QCMSession"],
    }),

    listTutorConversations: builder.query<{ results: TutorConversation[] }, void>({
      query: () => "/ai/tutor/conversations/",
      providesTags: ["TutorConversations"],
    }),

    getTutorMessages: builder.query<{ results: TutorMessage[] }, string>({
      query: (conversationId) => `/ai/tutor/conversations/${conversationId}/messages/`,
    }),
  }),
});

export const {
  useGenerateQCMMutation,
  useSubmitAnswerMutation,
  useGetQCMSessionQuery,
  useDeleteQCMSessionMutation,
  useGetQCMHistoryQuery,
  useListTutorConversationsQuery,
  useGetTutorMessagesQuery,
} = aiEngineApi;
