import { SurveyAnswers, SurveyResponse, SurveyRecord } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function submitSurvey(
  answers: SurveyAnswers
): Promise<SurveyResponse> {
  const response = await fetch(`${API_URL}/api/survey`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(answers),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to submit survey");
  }

  return response.json();
}

export async function getSurveyResults(id: string): Promise<SurveyRecord> {
  const response = await fetch(`${API_URL}/api/results/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Survey not found");
    }
    throw new Error("Failed to fetch results");
  }

  return response.json();
}
