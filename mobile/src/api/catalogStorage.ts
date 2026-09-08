import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ExamDetail, ExamListItem } from "@/types";

const EXAMS_KEY = "kourou_catalog_exams";
const EXAM_DETAIL_PREFIX = "kourou_catalog_exam_";

export async function getCachedExams(): Promise<ExamListItem[]> {
  try {
    const value = await AsyncStorage.getItem(EXAMS_KEY);
    return value ? (JSON.parse(value) as ExamListItem[]) : [];
  } catch {
    return [];
  }
}

export async function cacheExams(exams: ExamListItem[]): Promise<void> {
  await AsyncStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
}

export async function getCachedExam(code: string): Promise<ExamDetail | null> {
  try {
    const value = await AsyncStorage.getItem(`${EXAM_DETAIL_PREFIX}${code}`);
    return value ? (JSON.parse(value) as ExamDetail) : null;
  } catch {
    return null;
  }
}

export async function cacheExam(exam: ExamDetail): Promise<void> {
  await AsyncStorage.setItem(`${EXAM_DETAIL_PREFIX}${exam.code}`, JSON.stringify(exam));
}