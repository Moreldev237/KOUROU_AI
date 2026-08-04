import { baseApi } from "@/store/api/baseApi";
import type { AuthTokens, StudyLevel, User } from "@/types";

interface RegisterRequest {
  phone_number?: string;
  email?: string;
  password: string;
  full_name: string;
  target_exam?: number;
  study_level?: StudyLevel;
}

interface RegisterResponse extends Partial<AuthTokens> {
  message: string;
  user?: User;
  phone_number?: string;
  requires_otp?: boolean;
}

interface VerifyOTPRequest {
  phone_number: string;
  code: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

type AuthResponse = AuthTokens & { user: User };

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (body) => ({ url: "/auth/register/", method: "POST", body }),
    }),

    verifyOtp: builder.mutation<AuthResponse, VerifyOTPRequest>({
      query: (body) => ({ url: "/auth/otp/verify/", method: "POST", body }),
    }),

    resendOtp: builder.mutation<{ message: string }, { phone_number: string; purpose?: string }>({
      query: (body) => ({ url: "/auth/otp/resend/", method: "POST", body }),
    }),

    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({ url: "/auth/login/", method: "POST", body }),
    }),

    requestPasswordReset: builder.mutation<{ message: string }, { email: string }>({
      query: (body) => ({ url: "/auth/password-reset/request/", method: "POST", body }),
    }),

    confirmPasswordReset: builder.mutation<
      { message: string },
      { email: string; code: string; new_password: string }
    >({
      query: (body) => ({ url: "/auth/password-reset/confirm/", method: "POST", body }),
    }),

    getMe: builder.query<User, void>({
      query: () => "/auth/me/",
      providesTags: ["Profile"],
    }),

    updateMe: builder.mutation<User, Partial<Pick<User, "full_name" | "target_exam" | "study_level">>>({
      query: (body) => ({ url: "/auth/me/", method: "PATCH", body }),
      invalidatesTags: ["Profile"],
    }),
  }),
});

export const {
  useRegisterMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useLoginMutation,
  useRequestPasswordResetMutation,
  useConfirmPasswordResetMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useUpdateMeMutation,
} = authApi;
