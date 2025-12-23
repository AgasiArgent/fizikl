export type ActivityLevel = "Низкий" | "Средний" | "Высокий" | "Очень высокий";

export type Goal =
  | "Похудение"
  | "Набор массы"
  | "Поддержание формы"
  | "Улучшение здоровья";

export type FastFoodFrequency =
  | "Никогда"
  | "Редко"
  | "Иногда"
  | "Часто"
  | "Очень часто";

export interface SurveyAnswers {
  name: string;
  age: number;
  activity_level: ActivityLevel;
  goal: Goal;
  workouts_per_week: number;
  sleep_hours: number;
  stress_level: number;
  water_liters: number;
  fastfood_frequency: FastFoodFrequency;
  smokes: boolean;
}

export interface Gauges {
  health_index: number;
  activity_score: number;
  recovery_quality: number;
  lifestyle_balance: number;
  energy_index: number;
  metabolic_load: number;
  cardio_risk: number;
  consistency: number;
  readiness: number;
  confidence: number;
}

export interface Scores {
  activity: number;
  sleep: number;
  stress: number;
  hydration: number;
  nutrition: number;
  smoking: number;
  age_modifier: number;
  movement_neat: number;
  recovery_debt: number;
  nutrition_stability: number;
  habit_score: number;
}

export interface RadarPoint {
  key: string;
  label: string;
  value: number;
}

export interface ChartPoint {
  key: string;
  label: string;
  value: number;
}

export interface Donut {
  good: number;
  needs_work: number;
}

export interface Target {
  key: string;
  label: string;
  current: number;
  next_tier: number;
  suggested: string;
}

export interface Charts {
  dimensions: ChartPoint[];
  good_vs_needs_work: Donut;
  risk_composition: ChartPoint[];
  percentiles: ChartPoint[];
  targets: Target[];
}

export interface Insight {
  summary_text: string;
  strengths: string[];
  improvement_areas: string[];
  persona_tag: string;
}

export interface Alert {
  key: string;
  severity: "info" | "warn" | "high";
  title: string;
  body: string;
}

export interface Recommendation {
  key: string;
  title: string;
  why: string;
  next_step: string;
  priority: number;
  category: string;
}

export interface Recommendations {
  top_3: Recommendation[];
  all: Recommendation[];
}

export interface Flags {
  risk_flags: string[];
  data_quality: string[];
  alerts: Alert[];
}

export interface UserInfo {
  name: string;
  age: number;
  goal: Goal;
}

export interface Summary {
  user: UserInfo;
  gauges: Gauges;
  scores: Scores;
  radar: RadarPoint[];
  charts: Charts;
  insight: Insight;
  recommendations: Recommendations;
  flags: Flags;
  generated_at: string;
  version: string;
}

export interface SurveyResponse {
  id: string;
  results: Summary;
}

export interface SurveyRecord {
  id: string;
  answers: SurveyAnswers;
  results: Summary;
  created_at: string;
}
