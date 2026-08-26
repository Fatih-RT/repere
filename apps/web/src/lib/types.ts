// Mirrors pb_migrations/ field-for-field. Raw record shapes as PocketBase
// returns them — snake_case, matching the collection schema — not the
// French-computed view models the old Express API used to return.
// Aggregation (mastery %, "due", relative dates, etc.) now happens
// client-side; see the per-domain lib files added in later steps.

export type Theme = "light" | "dark" | "rose";

// Not a stored field anymore (see PB step 4/5: difficulty is computed from
// ease_factor, not entered manually) — kept as a display-only label type
// for the badge component.
export type Difficulty = "Facile" | "Moyen" | "Difficile";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  class_name: string;
  avatar: string;
}

export type SrsState = "new" | "learning" | "review";
export type Rating = "again" | "hard" | "good";
export type PomodoroPhase = "focus" | "short_break" | "long_break";
export type ReviewSessionMode = "due" | "selection";

export interface Category {
  id: string;
  user: string;
  name: string;
  hue: number;
  icon: string;
  position: number;
  deleted_at: string;
  created: string;
  updated: string;
}

export interface Subject {
  id: string;
  user: string;
  name: string;
  description: string;
  icon: string;
  hue: number;
  // Empty string = no category, same convention as every other optional
  // relation in this app (question/session on review_logs, etc.).
  category: string;
  position: number;
  deleted_at: string;
  created: string;
  updated: string;
}

export interface Chapter {
  id: string;
  user: string;
  subject: string;
  name: string;
  position: number;
  deleted_at: string;
  created: string;
  updated: string;
}

export interface Note {
  id: string;
  user: string;
  subject: string;
  // Empty string = the note covers the whole matière, not one chapter —
  // same "empty relation = none" convention as subjects.category.
  chapter: string;
  title: string;
  content: string;
  position: number;
  deleted_at: string;
  created: string;
  updated: string;
}

export interface Question {
  id: string;
  user: string;
  chapter: string;
  subject: string;
  question: string;
  answer: string;
  question_images: string[];
  answer_images: string[];
  suspended: boolean;
  deleted_at: string;
  state: SrsState;
  due_at: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  lapses: number;
  last_reviewed_at: string;
  created: string;
  updated: string;
}

export interface ReviewSession {
  id: string;
  user: string;
  mode: ReviewSessionMode;
  subject: string;
  chapter: string;
  started_at: string;
  ended_at: string;
  cards_seen: number;
  cards_correct: number;
  created: string;
  updated: string;
}

export interface ReviewLog {
  id: string;
  user: string;
  // Optional: cleared when the reviewed question (or session) is later hard-
  // deleted from the trash — question_text/answer_text are the durable
  // record, snapshotted at write time so the log stays readable regardless.
  question: string;
  session: string;
  question_text: string;
  answer_text: string;
  rating: Rating;
  state_before: SrsState;
  interval_before: number;
  interval_after: number;
  ease_before: number;
  ease_after: number;
  duration_ms: number;
  reviewed_at: string;
  scheduler_version: string;
  created: string;
}

export interface PomodoroSession {
  id: string;
  user: string;
  subject: string;
  chapter: string;
  phase: PomodoroPhase;
  planned_seconds: number;
  actual_seconds: number;
  started_at: string;
  ended_at: string;
  completed: boolean;
  created: string;
  updated: string;
}

export interface UserSettings {
  id: string;
  user: string;
  theme: Theme;
  follow_system: boolean;
  timezone: string;
  day_cutoff_hour: number;
  daily_new_limit: number;
  daily_review_limit: number;
  pomo_work: number;
  pomo_short: number;
  pomo_long: number;
  pomo_sessions: number;
  daily_goal_mins: number;
  mix_subjects: boolean;
  notif: boolean;
  sons: boolean;
  anim: boolean;
  created: string;
  updated: string;
}

export const DEFAULT_SETTINGS: Omit<UserSettings, "id" | "user" | "created" | "updated"> = {
  theme: "dark",
  follow_system: false,
  timezone: "Europe/Paris",
  day_cutoff_hour: 4,
  daily_new_limit: 20,
  daily_review_limit: 200,
  pomo_work: 25,
  pomo_short: 5,
  pomo_long: 15,
  pomo_sessions: 4,
  daily_goal_mins: 100,
  mix_subjects: true,
  notif: true,
  sons: false,
  anim: true,
};
