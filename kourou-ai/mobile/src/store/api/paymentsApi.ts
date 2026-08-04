import { baseApi } from "@/store/api/baseApi";
import type { Paginated, Subscription, SubscriptionPlan, Transaction } from "@/types";

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPlans: builder.query<Paginated<SubscriptionPlan>, void>({
      query: () => "/payments/plans/",
    }),

    initiatePayment: builder.mutation<Transaction, { plan: number }>({
      query: (body) => ({ url: "/payments/initiate/", method: "POST", body }),
      invalidatesTags: ["Transactions"],
    }),

    listTransactions: builder.query<Paginated<Transaction>, void>({
      query: () => "/payments/transactions/",
      providesTags: ["Transactions"],
    }),

    getMySubscription: builder.query<Subscription | null, void>({
      query: () => "/payments/subscription/me/",
      providesTags: ["Subscription"],
    }),
  }),
});

export const {
  useListPlansQuery,
  useInitiatePaymentMutation,
  useListTransactionsQuery,
  useGetMySubscriptionQuery,
} = paymentsApi;
