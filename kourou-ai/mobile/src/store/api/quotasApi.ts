import { baseApi } from "@/store/api/baseApi";
import type { UserQuota } from "@/types";

export const quotasApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyQuota: builder.query<UserQuota, void>({
      query: () => "/quotas/me/",
      providesTags: ["Quota"],
    }),
  }),
});

export const { useGetMyQuotaQuery } = quotasApi;
