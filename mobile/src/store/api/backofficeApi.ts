import { baseApi } from "@/store/api/baseApi";
import type { PlatformStats } from "@/types";

export interface CreateAdminUserRequest {
  full_name: string;
  email?: string;
  phone_number?: string;
  password: string;
}

export interface GrantAdminTokensRequest {
  email?: string;
  phone_number?: string;
  user_id?: string;
  tokens: number;
}

export interface CreateAdminExamRequest {
  name: string;
  description?: string;
  organizing_body?: string;
  prize_amount_fcfa?: number;
  icon_emoji?: string;
  color_hex?: string;
}

export interface AdminUserListItem {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  is_premium: boolean;
  is_active: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
  referred_by: string | null;
  quota_daily_limit: number;
  created_at: string;
}

export interface TopReferrerItem {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  referrals: number;
  reward_fcfa: number;
}

export interface AdminDashboardData {
  users: AdminUserListItem[];
  premium_users: AdminUserListItem[];
  suspended_users: AdminUserListItem[];
  top_referrers: TopReferrerItem[];
}

export const backofficeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformStats: builder.query<PlatformStats, void>({
      query: () => "/backoffice/stats/",
      providesTags: ["Backoffice"],
    }),

    getAdminDashboard: builder.query<AdminDashboardData, void>({
      query: () => "/backoffice/dashboard/",
      providesTags: ["Backoffice"],
    }),

    createAdminUser: builder.mutation<{ id: string; full_name: string; email: string | null; phone_number: string | null }, CreateAdminUserRequest>({
      query: (body) => ({ url: "/backoffice/users/", method: "POST", body }),
      invalidatesTags: ["Backoffice"],
    }),

    deleteAdminUser: builder.mutation<{ message: string }, { email?: string; phone_number?: string; user_id?: string }>({
      query: (body) => ({ url: "/backoffice/users/delete/", method: "POST", body }),
      invalidatesTags: ["Backoffice"],
    }),

    grantAdminTokens: builder.mutation<{ message: string; daily_limit: number; user_id: string }, GrantAdminTokensRequest>({
      query: (body) => ({ url: "/backoffice/tokens/grant/", method: "POST", body }),
      invalidatesTags: ["Backoffice"],
    }),

    createAdminExam: builder.mutation<{ id: number; name: string; code: string; description: string; organizing_body: string; prize_amount_fcfa: number; icon_emoji: string; color_hex: string }, CreateAdminExamRequest>({
      query: (body) => ({ url: "/backoffice/exams/", method: "POST", body }),
      invalidatesTags: ["Backoffice"],
    }),
  }),
});

export const {
  useGetPlatformStatsQuery,
  useGetAdminDashboardQuery,
  useCreateAdminUserMutation,
  useDeleteAdminUserMutation,
  useGrantAdminTokensMutation,
  useCreateAdminExamMutation,
} = backofficeApi;
