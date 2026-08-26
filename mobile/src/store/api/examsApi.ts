import { baseApi } from "@/store/api/baseApi";
import type { ExamDetail, ExamListItem, Paginated, SubjectDetail } from "@/types";

export const examsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listExams: builder.query<Paginated<ExamListItem>, void>({
      query: () => "/exams/",
      providesTags: ["Exams"],
    }),

    getExam: builder.query<ExamDetail, string>({
      query: (code) => `/exams/${code}/`,
      providesTags: (_result, _err, code) => [{ type: "Exams", id: code }],
    }),

    getSubject: builder.query<SubjectDetail, number>({
      query: (id) => `/subjects/${id}/`,
      providesTags: (_result, _err, id) => [{ type: "Subject", id }],
    }),
  }),
});

export const { useListExamsQuery, useGetExamQuery, useGetSubjectQuery } = examsApi;
