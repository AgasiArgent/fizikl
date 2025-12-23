"""
API routes for Fizikl Health Survey
"""

from fastapi import APIRouter, HTTPException

from .database import get_survey, save_survey
from .insights import generate_insights
from .models import SurveyAnswers, SurveyRecord, SurveyResponse

router = APIRouter(prefix="/api", tags=["survey"])


@router.post("/survey", response_model=SurveyResponse)
async def submit_survey(answers: SurveyAnswers) -> SurveyResponse:
    """
    Submit survey answers and get personalized health insights.

    - Validates input data
    - Generates insights using the algorithm
    - Saves results to database
    - Returns unique ID and full results
    """
    # Generate insights from answers
    results = generate_insights(answers)

    # Save to database
    survey_id = save_survey(answers, results)

    return SurveyResponse(id=survey_id, results=results)


@router.get("/results/{survey_id}", response_model=SurveyRecord)
async def get_results(survey_id: str) -> SurveyRecord:
    """
    Retrieve survey results by ID.

    - Returns full survey record including answers and results
    - Returns 404 if survey not found
    """
    record = get_survey(survey_id)

    if record is None:
        raise HTTPException(
            status_code=404,
            detail=f"Survey with ID '{survey_id}' not found"
        )

    return record
