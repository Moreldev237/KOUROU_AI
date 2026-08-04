// Types partagés, alignés champ pour champ sur les serializers DRF du backend
// (voir backend/apps/*/serializers.py). Toute évolution d'un serializer côté
// backend doit être répercutée ici.

export type StudyLevel = "cep" | "bepc" | "bac" | "licence" | "master" | "autre";

export interface User {
  id: string;
  phone_number: string | null;
  email: string | null;
  full_name: string;
  target_exam: number | null;
  target_exam_name: string | null;
  study_level: StudyLevel;
  is_premium: boolean;
  phone_verified: boolean;
  email_verified: boolean;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface Paginated<T> {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --- Concours (exams) --------------------------------------------------------

export interface ExamListItem {
  id: number;
  name: string;
  code: string;
  organizing_body: string;
  icon_emoji: string;
  color_hex: string;
  subjects_count: number;
}

export interface SubjectLight {
  id: number;
  name: string;
  coefficient: number;
  order: number;
  topics_count: number;
}

export interface ExamDetail {
  id: number;
  name: string;
  code: string;
  description: string;
  organizing_body: string;
  icon_emoji: string;
  color_hex: string;
  subjects: SubjectLight[];
}

export interface Topic {
  id: number;
  name: string;
  order: number;
}

export interface SubjectDetail {
  id: number;
  name: string;
  description: string;
  coefficient: number;
  order: number;
  topics: Topic[];
}

// --- Moteur IA ---------------------------------------------------------------

export type SessionMode = "qcm_batch" | "guided_exercise";
export type Difficulty = "facile" | "moyen" | "difficile";

export interface Choice {
  key: string;
  text: string;
}

export interface QuestionPublic {
  id: number;
  order: number;
  question_text: string;
  choices: Choice[];
}

export interface QuestionCorrected extends QuestionPublic {
  correct_choice_key: string;
  explanation: string;
  selected_choice_key: string | null;
  is_correct: boolean | null;
}

export interface QCMSession {
  id: string;
  exam: number;
  exam_name: string;
  subject: number;
  subject_name: string;
  topic: number | null;
  mode: SessionMode;
  difficulty: Difficulty;
  served_from_cache: boolean;
  started_at: string;
  completed_at: string | null;
  score_percent: number | null;
  questions: QuestionPublic[] | QuestionCorrected[];
}

export interface QCMSessionListItem {
  id: string;
  exam_name: string;
  subject_name: string;
  difficulty: Difficulty;
  started_at: string;
  completed_at: string | null;
  score_percent: number | null;
  question_count: number;
}

export interface SubmitAnswerResult {
  is_correct: boolean;
  correct_choice_key: string;
  explanation: string;
  answered_at: string;
}

export interface TutorConversation {
  id: string;
  exam: number | null;
  subject: number | null;
  topic: number | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export type MessageRole = "user" | "assistant";

export interface TutorMessage {
  id: number;
  role: MessageRole;
  content: string;
  created_at: string;
}

// --- Quotas --------------------------------------------------------------------

export interface UserQuota {
  daily_limit: number;
  used_today: number;
  remaining: number | null; // null = illimité (premium)
  is_unlimited: boolean;
  last_reset_date: string;
}

// --- Paiements -------------------------------------------------------------------

export type BillingCycle = "one_time" | "monthly";

export interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description: string;
  exam: number | null;
  exam_name: string | null;
  billing_cycle: BillingCycle;
  price_fcfa: number;
  duration_days: number;
  is_unlimited_generation: boolean;
}

export type TransactionStatus = "pending" | "completed" | "failed";

export interface Transaction {
  id: string;
  plan: number;
  plan_name: string;
  amount_fcfa: number;
  status: TransactionStatus;
  payment_url: string;
  created_at: string;
}

export type SubscriptionStatus = "active" | "expired" | "cancelled";

export interface Subscription {
  id: number;
  plan: number;
  plan_name: string;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
}

// --- Erreurs API (format uniforme, voir common/exceptions.py) --------------------

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}
