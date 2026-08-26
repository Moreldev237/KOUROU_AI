import { baseApi } from "@/store/api/baseApi";
import type { PlatformStats } from "@/types";

export const backofficeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformStats: builder.query<PlatformStats, void>({
      query: () => "/backoffice/stats/",
      providesTags: ["Backoffice"],
    }),
  }),
});

export const { useGetPlatformStatsQuery } = backofficeApi;
