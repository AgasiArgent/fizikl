"""
Pydantic models for Fizikl Health Survey API
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ---------- Enums ----------

class ActivityLevel(str, Enum):
    """Physical activity level"""
    LOW = "Низкий"
    MEDIUM = "Средний"
    HIGH = "Высокий"
    VERY_HIGH = "Очень высокий"


class Goal(str, Enum):
    """User's fitness goal"""
    FAT_LOSS = "Похудение"
    MASS_GAIN = "Набор массы"
    MAINTAIN = "Поддержание формы"
    HEALTH = "Улучшение здоровья"


class FastFoodFrequency(str, Enum):
    """How often user eats fast food"""
    NEVER = "Никогда"
    RARELY = "Редко"
    SOMETIMES = "Иногда"
    OFTEN = "Часто"
    VERY_OFTEN = "Очень часто"


# ---------- Input Model ----------

class SurveyAnswers(BaseModel):
    """Survey input data from user"""
    name: str = Field(..., min_length=1, max_length=100, description="User's name")
    age: int = Field(..., ge=18, le=80, description="Age (18-80)")
    activity_level: ActivityLevel = Field(..., description="Physical activity level")
    goal: Goal = Field(..., description="Fitness goal")
    workouts_per_week: int = Field(..., ge=0, le=7, description="Workouts per week (0-7)")
    sleep_hours: float = Field(..., ge=4, le=12, description="Average sleep hours (4-12)")
    stress_level: int = Field(..., ge=1, le=10, description="Stress level (1-10)")
    water_liters: float = Field(..., ge=0, le=5, description="Daily water intake in liters (0-5)")
    fastfood_frequency: FastFoodFrequency = Field(..., description="Fast food consumption frequency")
    smokes: bool = Field(..., description="Whether user smokes")

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Иван",
                "age": 30,
                "activity_level": "Средний",
                "goal": "Улучшение здоровья",
                "workouts_per_week": 3,
                "sleep_hours": 7.5,
                "stress_level": 5,
                "water_liters": 2.0,
                "fastfood_frequency": "Редко",
                "smokes": False
            }
        }
    }


# ---------- Output Models ----------

class UserInfo(BaseModel):
    """User info in summary"""
    name: str
    age: int
    goal: Goal


class Gauges(BaseModel):
    """Main gauge metrics (0-100)"""
    health_index: int = Field(..., ge=0, le=100, description="Overall health index")
    activity_score: int = Field(..., ge=0, le=100, description="Activity score")
    recovery_quality: int = Field(..., ge=0, le=100, description="Recovery quality")
    lifestyle_balance: int = Field(..., ge=0, le=100, description="Lifestyle balance")
    energy_index: int = Field(..., ge=0, le=100, description="Energy index")
    metabolic_load: int = Field(..., ge=0, le=100, description="Metabolic load (higher=worse)")
    cardio_risk: int = Field(..., ge=0, le=100, description="Cardio risk (higher=worse)")
    consistency: int = Field(..., ge=0, le=100, description="Lifestyle consistency")
    readiness: int = Field(..., ge=0, le=100, description="Today-like readiness")
    confidence: int = Field(..., ge=0, le=100, description="Output confidence")


class Scores(BaseModel):
    """Atomic subscores (0-100)"""
    activity: int
    sleep: int
    stress: int
    hydration: int
    nutrition: int
    smoking: int
    age_modifier: int
    movement_neat: int
    recovery_debt: int
    nutrition_stability: int
    habit_score: int


class RadarPoint(BaseModel):
    """Single point on radar chart"""
    key: str
    label: str
    value: int = Field(..., ge=0, le=100)


class ChartPoint(BaseModel):
    """Single point for bar/dimension charts"""
    key: str
    label: str
    value: int = Field(..., ge=0, le=100)


class Donut(BaseModel):
    """Good vs needs-work donut chart data"""
    good: int = Field(..., ge=0, le=100)
    needs_work: int = Field(..., ge=0, le=100)


class Target(BaseModel):
    """Progress target suggestion"""
    key: str
    label: str
    current: int
    next_tier: int
    suggested: str


class Charts(BaseModel):
    """All chart data"""
    dimensions: list[ChartPoint]
    good_vs_needs_work: Donut
    risk_composition: list[ChartPoint]
    percentiles: list[ChartPoint]
    targets: list[Target]


class Insight(BaseModel):
    """Text insights"""
    summary_text: str
    strengths: list[str]
    improvement_areas: list[str]
    persona_tag: str


class Alert(BaseModel):
    """Risk alert"""
    key: str
    severity: str  # info/warn/high
    title: str
    body: str


class Recommendation(BaseModel):
    """Single recommendation"""
    key: str
    title: str
    why: str
    next_step: str
    priority: int = Field(..., ge=1, le=100)
    category: str


class Recommendations(BaseModel):
    """Top recommendations + all"""
    top_3: list[Recommendation]
    all: list[Recommendation]


class Flags(BaseModel):
    """Risk flags and alerts"""
    risk_flags: list[str]
    data_quality: list[str]
    alerts: list[Alert]


class Debug(BaseModel):
    """Debug info (optional)"""
    sub_scores: dict[str, int]
    weights: dict[str, int]
    notes: list[str]


class Summary(BaseModel):
    """Full algorithm output - matches Go Summary struct"""
    user: UserInfo
    gauges: Gauges
    scores: Scores
    radar: list[RadarPoint]
    charts: Charts
    insight: Insight
    recommendations: Recommendations
    flags: Flags
    debug: Debug
    generated_at: str
    version: str = "insights.v2"


# ---------- API Response Models ----------

class SurveyResponse(BaseModel):
    """Response after submitting survey"""
    id: str
    results: Summary


class SurveyRecord(BaseModel):
    """Stored survey record"""
    id: str
    answers: SurveyAnswers
    results: Summary
    created_at: datetime
