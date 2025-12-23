"""
Fizikl Insights Algorithm
Ported from Go to Python

Original: insights.go (~1200 lines)
This port maintains identical logic and output structure.
"""

import math
from datetime import datetime, timezone
from typing import Optional

from .models import (
    ActivityLevel,
    Alert,
    Charts,
    ChartPoint,
    Debug,
    Donut,
    FastFoodFrequency,
    Flags,
    Gauges,
    Goal,
    Insight,
    RadarPoint,
    Recommendation,
    Recommendations,
    Scores,
    Summary,
    SurveyAnswers,
    Target,
    UserInfo,
)


# ---------- Validation ----------

def validate(answers: SurveyAnswers) -> tuple[list[str], list[str]]:
    """
    Validate answers and return data quality warnings and notes.
    Raises ValueError for hard validation errors.
    """
    dq: list[str] = []  # data quality warnings
    notes: list[str] = []

    name = answers.name.strip()
    if not name:
        dq.append("Имя не заполнено — будет использован плейсхолдер.")

    # Soft inconsistencies -> confidence penalty later
    if answers.workouts_per_week == 0 and answers.activity_level in (
        ActivityLevel.HIGH,
        ActivityLevel.VERY_HIGH,
    ):
        dq.append("Несостыковка: высокий уровень активности при 0 тренировок/нед.")
        notes.append("mismatch.activity_vs_workouts")

    if answers.workouts_per_week >= 6 and answers.activity_level == ActivityLevel.LOW:
        dq.append("Несостыковка: низкий уровень активности при 6–7 тренировок/нед.")
        notes.append("mismatch.activity_low_but_many_workouts")

    if answers.water_liters == 0:
        dq.append("Вода указана как 0 л — возможно, значение пропущено.")
        notes.append("water.zero")

    if answers.sleep_hours <= 4.5:
        dq.append("Очень низкий сон — проверьте, что указано среднее значение.")
        notes.append("sleep.very_low")

    return dq, notes


# ---------- Helper Functions ----------

def clamp(value: int, lo: int, hi: int) -> int:
    """Clamp integer value to range [lo, hi]"""
    return max(lo, min(hi, value))


def append_unique(lst: list[str], item: str) -> list[str]:
    """Append item to list if not already present"""
    if item not in lst:
        lst.append(item)
    return lst


def trim_sentence(s: str) -> str:
    """Trim whitespace and ensure ends with period"""
    s = s.strip().rstrip(".")
    return s + "."


# ---------- Atomic Scoring Functions ----------

def score_activity(level: ActivityLevel, workouts: int) -> int:
    """Score activity based on level and workouts per week"""
    base_scores = {
        ActivityLevel.LOW: 25,
        ActivityLevel.MEDIUM: 50,
        ActivityLevel.HIGH: 70,
        ActivityLevel.VERY_HIGH: 85,
    }
    base = base_scores.get(level, 50)
    bonus = clamp(workouts * 4, 0, 28)

    # Mismatch penalties
    mismatch = 0
    if level in (ActivityLevel.VERY_HIGH, ActivityLevel.HIGH) and workouts <= 1:
        mismatch += 10
    if level == ActivityLevel.LOW and workouts >= 5:
        mismatch += 6

    return clamp(base + bonus - mismatch, 0, 100)


def score_neat(level: ActivityLevel, workouts: int) -> int:
    """
    Score non-exercise activity thermogenesis (NEAT).
    Proxy for everyday movement beyond workouts.
    """
    base_scores = {
        ActivityLevel.LOW: 30,
        ActivityLevel.MEDIUM: 55,
        ActivityLevel.HIGH: 70,
        ActivityLevel.VERY_HIGH: 80,
    }
    base = base_scores.get(level, 55)
    bonus = clamp(workouts * 3, 0, 18)
    return clamp(base + bonus, 0, 100)


def score_sleep(hours: float) -> int:
    """Score sleep quality based on hours (optimal = 8)"""
    opt = 8.0
    diff = abs(hours - opt)
    score = 100.0 - (diff * diff * 6.0)  # quadratic penalty
    return clamp(int(round(score)), 0, 100)


def score_stress(stress: int) -> int:
    """Score stress (1=best -> 100, 10=worst -> 10)"""
    score = 110 - stress * 10
    return clamp(score, 0, 100)


def score_hydration(liters: float) -> int:
    """Score hydration based on daily water intake"""
    if liters <= 0:
        return 0
    score = 40 + liters * 24  # 2.5L -> 100
    return clamp(int(round(score)), 0, 100)


def score_nutrition(ff: FastFoodFrequency) -> int:
    """Score nutrition based on fast food frequency"""
    scores = {
        FastFoodFrequency.NEVER: 95,
        FastFoodFrequency.RARELY: 80,
        FastFoodFrequency.SOMETIMES: 60,
        FastFoodFrequency.OFTEN: 35,
        FastFoodFrequency.VERY_OFTEN: 15,
    }
    return scores.get(ff, 50)


def score_nutrition_stability(ff: FastFoodFrequency, stress: int) -> int:
    """
    Score nutrition stability.
    Stress often destabilizes food choices.
    """
    base = score_nutrition(ff)
    penalty = 0
    if stress >= 8:
        penalty = 12
    elif stress >= 6:
        penalty = 6
    return clamp(base - penalty, 0, 100)


def score_smoking(smokes: bool) -> int:
    """Score smoking habit"""
    return 20 if smokes else 90


def score_age_modifier(age: int) -> int:
    """
    Age modifier score.
    18 -> 95, 80 -> 55 (not medical!)
    """
    t = (age - 18) / (80 - 18)  # 0..1
    score = 95 - t * 40
    return clamp(int(round(score)), 0, 100)


def score_recovery_debt(sleep: float, stress: int, workouts: int) -> int:
    """
    Calculate recovery debt (higher = worse).
    Based on sleep shortage, stress load, and training load.
    """
    debt = 0.0

    # Sleep shortage
    if sleep < 7.0:
        debt += (7.0 - sleep) * 18.0  # up to ~54 points at 4h

    # Stress load (above 5 adds debt)
    debt += max(0, stress - 5) * 8.0

    # Training load
    if workouts >= 5:
        debt += (workouts - 4) * 7.0

    return clamp(int(round(debt)), 0, 100)


def score_consistency(
    workouts: int, sleep: float, ff: FastFoodFrequency, water: float
) -> int:
    """
    Score lifestyle consistency.
    Signals how "repeatable" the lifestyle is.
    """
    s = 60

    # Workouts regularity
    if workouts == 0:
        s -= 10
    elif workouts == 1:
        s -= 5
    elif 2 <= workouts <= 4:
        s += 10
    elif workouts >= 5:
        s += 6

    # Sleep
    if 7.0 <= sleep <= 9.0:
        s += 12
    elif sleep < 6.0:
        s -= 12
    else:
        s -= 4

    # Fast food
    if ff in (FastFoodFrequency.OFTEN, FastFoodFrequency.VERY_OFTEN):
        s -= 10
    elif ff in (FastFoodFrequency.NEVER, FastFoodFrequency.RARELY):
        s += 6

    # Water
    if water >= 1.8:
        s += 6
    elif water < 1.0:
        s -= 8

    return clamp(s, 0, 100)


def score_readiness(
    recovery: int, energy: int, cardio_risk: int, metabolic_load: int
) -> int:
    """Calculate 'today-like' readiness score"""
    r = 0.55 * recovery + 0.45 * energy
    r -= 0.20 * cardio_risk
    r -= 0.10 * metabolic_load
    return clamp(int(round(r)), 0, 100)


def balance_for_training_load(workouts: int) -> int:
    """Balance score based on training load"""
    if workouts == 0:
        return 60
    elif workouts <= 2:
        return 75
    elif workouts <= 4:
        return 90
    elif workouts <= 6:
        return 80
    else:
        return 70


def score_confidence(answers: SurveyAnswers, dq: list[str]) -> int:
    """
    Confidence score based on data quality and odd combos.
    Higher = more reliable output.
    """
    c = 92

    # Missing name is minor
    if not answers.name.strip():
        c -= 2

    # Each DQ warning reduces confidence
    c -= len(dq) * 6

    # Extreme values reduce confidence
    if answers.sleep_hours <= 4.5 or answers.sleep_hours >= 11.5:
        c -= 6
    if answers.water_liters == 0 or answers.water_liters >= 4.8:
        c -= 6

    return clamp(c, 40, 100)


def bool_to_risk(smokes: bool) -> int:
    """Convert smoking bool to risk value"""
    return 90 if smokes else 10


def age_risk(age: int) -> int:
    """
    Age-based risk factor.
    18 -> 10, 80 -> 70 (not medical!)
    """
    t = (age - 18) / (80 - 18)
    return clamp(int(round(10 + t * 60)), 0, 100)


# ---------- Weighted Average ----------

def weighted_average(sub: dict[str, int], weights: dict[str, int]) -> int:
    """Calculate weighted average of subscores"""
    sum_w = sum(weights.values())
    if sum_w == 0:
        return 0
    total = sum(sub[k] * w for k, w in weights.items())
    return clamp(int(round(total / sum_w)), 0, 100)


# ---------- Chart Builders ----------

def build_percentiles(
    health: int, activity: int, recovery: int, lifestyle: int, cardio_risk: int
) -> list[ChartPoint]:
    """
    Build percentile-like UI numbers.
    Heuristic mapping (not medical).
    """
    return [
        ChartPoint(
            key="health_pct",
            label="Индекс здоровья (перцентиль)",
            value=clamp(int(round(health * 0.9 + 10)), 0, 100),
        ),
        ChartPoint(
            key="activity_pct",
            label="Активность (перцентиль)",
            value=clamp(int(round(activity * 0.95 + 5)), 0, 100),
        ),
        ChartPoint(
            key="recovery_pct",
            label="Восстановление (перцентиль)",
            value=clamp(int(round(recovery * 0.9 + 10)), 0, 100),
        ),
        ChartPoint(
            key="balance_pct",
            label="Баланс (перцентиль)",
            value=clamp(int(round(lifestyle * 0.9 + 10)), 0, 100),
        ),
        ChartPoint(
            key="risk_pct",
            label="Кардио-риск (перцентиль ниже = лучше)",
            value=clamp(100 - cardio_risk, 0, 100),
        ),
    ]


def next_tier(v: int) -> int:
    """Get next tier target value"""
    if v < 40:
        return 55
    elif v < 55:
        return 70
    elif v < 70:
        return 82
    else:
        return 90


def build_targets(
    sub: dict[str, int], neat: int, habit_score: int, recovery_debt: int, workouts: int
) -> list[Target]:
    """Build progress target suggestions"""
    targets: list[Target] = []

    def add(key: str, label: str, current: int, next_val: int, suggested: str):
        if current < next_val:
            targets.append(
                Target(
                    key=key,
                    label=label,
                    current=current,
                    next_tier=next_val,
                    suggested=suggested,
                )
            )

    add(
        "sleep",
        "Сон",
        sub["sleep"],
        next_tier(sub["sleep"]),
        "Добавьте +30 минут ко сну и зафиксируйте подъём.",
    )
    add(
        "hydration",
        "Вода",
        sub["hydration"],
        next_tier(sub["hydration"]),
        "Добавьте +0.5 л/день (постепенно).",
    )
    add(
        "nutrition",
        "Питание",
        sub["nutrition"],
        next_tier(sub["nutrition"]),
        "Снизьте фастфуд на 1 шаг и сделайте 1 «якорный» приём пищи.",
    )

    # Dynamic activity suggestion based on current workouts
    if workouts >= 3:
        activity_suggestion = "Добавьте шаги или повысьте интенсивность тренировок."
    elif workouts >= 1:
        activity_suggestion = "Добавьте ещё 1–2 тренировки в неделю или больше шагов."
    else:
        activity_suggestion = "Начните с 2–3 тренировок в неделю или добавьте шаги."

    add(
        "activity",
        "Активность",
        sub["activity"],
        next_tier(sub["activity"]),
        activity_suggestion,
    )
    add(
        "neat",
        "Движение (NEAT)",
        neat,
        next_tier(neat),
        "Поставьте цель по шагам и делайте 2 короткие прогулки в день.",
    )
    add(
        "habits",
        "Привычки",
        habit_score,
        next_tier(habit_score),
        "Вода + меньше фастфуда + (если нужно) снижение курения.",
    )

    # Recovery debt is inverse: lower is better
    if recovery_debt > 35:
        targets.append(
            Target(
                key="recovery_debt",
                label="Долг восстановления",
                current=100 - recovery_debt,
                next_tier=70,
                suggested="Снизьте нагрузку на неделю и добавьте сон/антистресс.",
            )
        )

    return targets


def normalize_to_100(points: list[ChartPoint]) -> list[ChartPoint]:
    """Normalize list of values to sum to 100 (for pie/stacked charts)"""
    total = sum(max(0, p.value) for p in points)
    if total == 0:
        return points

    result: list[ChartPoint] = []
    acc = 0
    for i, p in enumerate(points):
        v = max(0, p.value)
        pct = int(round(v * 100.0 / total))
        # Ensure sums to 100
        if i == len(points) - 1:
            pct = 100 - acc
        else:
            acc += pct
        result.append(
            ChartPoint(key=p.key, label=p.label, value=clamp(pct, 0, 100))
        )

    return result


# ---------- Text Builders ----------

def build_strengths_and_improvements(
    answers: SurveyAnswers,
    sub: dict[str, int],
    neat: int,
    habit_score: int,
    recovery_debt: int,
    nutrition_stability: int,
) -> tuple[list[str], list[str]]:
    """Build strengths and improvement areas lists"""

    items = [
        (
            sub["sleep"],
            "Сон близок к оптимальному — это ускоряет восстановление.",
            "Наладьте сон: цель — ~7–8 часов в среднем.",
        ),
        (
            sub["stress"],
            "Стресс под контролем — проще держать режим и прогрессировать.",
            "Снизьте стресс: он напрямую влияет на восстановление и пищевые привычки.",
        ),
        (
            sub["activity"],
            "Хорошая активность — сильная база для формы и здоровья.",
            "Добавьте регулярность движения: 2–3 тренировки или больше шагов дадут быстрый эффект.",
        ),
        (
            neat,
            "Неплохой уровень ежедневного движения (NEAT).",
            "Увеличьте ежедневное движение: прогулки/шаги — самый простой рычаг.",
        ),
        (
            habit_score,
            "Привычки в целом поддерживают здоровье.",
            "Улучшите привычки: вода/фастфуд/курение сильнее всего двигают индекс.",
        ),
        (
            nutrition_stability,
            "Питание выглядит достаточно устойчивым.",
            "Стабилизируйте питание: начните с 1 «якорного» приёма пищи в день.",
        ),
    ]

    strengths: list[str] = []
    improvements: list[str] = []

    # Pick top 3 highs
    sorted_high = sorted(items, key=lambda x: x[0], reverse=True)
    for val, hi, _ in sorted_high[:3]:
        if val >= 72:
            strengths.append(hi)

    # Pick bottom 3 lows
    sorted_low = sorted(items, key=lambda x: x[0])
    for val, _, lo in sorted_low[:3]:
        if val <= 58:
            improvements.append(lo)

    # Recovery debt explicit
    if recovery_debt >= 60:
        improvements = append_unique(
            improvements,
            "Сначала закройте «долг восстановления» (сон/стресс/нагрузка), потом ускоряйте прогресс.",
        )

    # Goal-tailored hint
    goal_hints = {
        Goal.FAT_LOSS: "Для похудения ключ — стабильность: сон + питание + шаги.",
        Goal.MASS_GAIN: "Для набора массы: 3 силовые/нед и приоритет восстановления.",
        Goal.MAINTAIN: "Для поддержания формы: удерживать привычки важнее, чем «идеально» тренироваться.",
        Goal.HEALTH: "Для здоровья: сон/вода/движение — самые быстрые рычаги.",
    }
    if answers.goal in goal_hints:
        improvements = append_unique(improvements, goal_hints[answers.goal])

    return strengths, improvements


def persona_tag(
    health: int, consistency: int, cardio_risk: int, recovery_debt: int
) -> str:
    """Determine user persona tag"""
    if health >= 80 and consistency >= 75 and cardio_risk < 40:
        return "Стабильный прогрессор"
    elif recovery_debt >= 60:
        return "Накапливает усталость"
    elif cardio_risk >= 65:
        return "Нужно снизить риски"
    elif consistency < 55:
        return "Нужен простой режим"
    else:
        return "Умеренный баланс"


def build_summary_text(
    name: str,
    answers: SurveyAnswers,
    gauges: Gauges,
    strengths: list[str],
    improvements: list[str],
) -> str:
    """Build summary text paragraph"""
    parts = [
        f"Привет, {name}! Индекс здоровья — {gauges.health_index}/100; "
        f"готовность — {gauges.readiness}/100; "
        f"уверенность расчёта — {gauges.confidence}/100. "
    ]

    if strengths:
        parts.append(f"Сильная сторона: {trim_sentence(strengths[0])} ")

    if improvements:
        parts.append(f"Зона роста: {trim_sentence(improvements[0])}")
    else:
        parts.append(
            "Показатели ровные — можно улучшать точечно без резких изменений."
        )

    return "".join(parts)


# ---------- Flags and Alerts ----------

def build_flags_and_alerts(
    answers: SurveyAnswers,
    sub: dict[str, int],
    recovery_debt: int,
    metabolic_load: int,
    cardio_risk: int,
    dq: list[str],
) -> Flags:
    """Build risk flags and alerts"""
    risk_flags: list[str] = []
    alerts: list[Alert] = []

    if answers.smokes:
        risk_flags.append("Курение: снижает выносливость и общий индекс здоровья.")
        alerts.append(
            Alert(
                key="smoking",
                severity="high",
                title="Фактор риска: курение",
                body="Даже сокращение количества сигарет улучшает метрики восстановления и кардио-риска.",
            )
        )

    if answers.sleep_hours < 6.0:
        risk_flags.append("Сон < 6 часов: восстановление и энергия вероятно проседают.")
        alerts.append(
            Alert(
                key="sleep_low",
                severity="high",
                title="Критически мало сна",
                body="Попробуйте добавить хотя бы +30 минут сна в течение ближайшей недели.",
            )
        )

    if answers.stress_level >= 8:
        risk_flags.append("Стресс 8–10: риск выгорания и срывов режима.")
        alerts.append(
            Alert(
                key="stress_high",
                severity="warn",
                title="Высокий стресс",
                body="Паузы/прогулки/дыхание по 5 минут 2 раза в день уже дают эффект на самочувствие.",
            )
        )

    if answers.water_liters < 1.2:
        risk_flags.append("Вода < 1.2 л: возможны скачки аппетита и усталость.")
        alerts.append(
            Alert(
                key="water_low",
                severity="info",
                title="Низкое потребление воды",
                body="Поднимайте объём постепенно: +0.3–0.5 л/день.",
            )
        )

    if answers.fastfood_frequency in (
        FastFoodFrequency.OFTEN,
        FastFoodFrequency.VERY_OFTEN,
    ):
        risk_flags.append("Фастфуд часто: нагрузка на метаболический профиль выше.")

    # Derived alerts
    if recovery_debt >= 60:
        alerts.append(
            Alert(
                key="recovery_debt",
                severity="warn",
                title="Накоплен долг восстановления",
                body="Сон/стресс/нагрузка сейчас складываются в риск перетренированности или отката.",
            )
        )

    if cardio_risk >= 65:
        alerts.append(
            Alert(
                key="cardio_risk",
                severity="warn",
                title="Повышенный кардио-риск (по анкете)",
                body="Это не диагноз. Улучшайте сон и активность, а при жалобах — консультируйтесь с врачом.",
            )
        )

    if metabolic_load >= 70:
        alerts.append(
            Alert(
                key="metabolic_load",
                severity="info",
                title="Высокая метаболическая нагрузка",
                body="Чаще всего улучшается через питание (реже фастфуд) и регулярное движение.",
            )
        )

    # If everything is fine: positive info
    if (
        not alerts
        and sub["sleep"] >= 75
        and sub["nutrition"] >= 70
        and sub["stress"] >= 65
    ):
        alerts.append(
            Alert(
                key="green_zone",
                severity="info",
                title="Вы в «зелёной зоне»",
                body="Сейчас лучшее — закрепить привычки и улучшать показатели точечно.",
            )
        )

    return Flags(risk_flags=risk_flags, data_quality=dq, alerts=alerts)


# ---------- Recommendations ----------

def build_recommendations(
    answers: SurveyAnswers,
    sub: dict[str, int],
    health: int,
    recovery: int,
    lifestyle: int,
    cardio_risk: int,
    metabolic_load: int,
    recovery_debt: int,
    confidence: int,
) -> list[Recommendation]:
    """Build personalized recommendations"""
    recs: list[Recommendation] = []

    def tier(v: int) -> str:
        if v >= 80:
            return "high"
        elif v >= 60:
            return "mid"
        else:
            return "low"

    # Sleep
    if tier(sub["sleep"]) != "high":
        recs.append(
            Recommendation(
                key="sleep_upgrade",
                title="Улучшить сон (первый рычаг)",
                why=f"Сон {sub['sleep']}/100 — он сильнее всего влияет на восстановление и энергию.",
                next_step="План на 7 дней: фиксированный подъём + уберите экран за 45 минут до сна.",
                priority=88,
                category="sleep",
            )
        )

    # Stress
    if tier(sub["stress"]) == "low" or answers.stress_level >= 7:
        recs.append(
            Recommendation(
                key="stress_protocol",
                title="Протокол снижения стресса",
                why="Стресс напрямую снижает качество восстановления и повышает вероятность срывов.",
                next_step="2× в день по 5 минут: прогулка/дыхание + один «безэкранный» слот вечером.",
                priority=82,
                category="stress",
            )
        )

    # Hydration
    if sub["hydration"] < 70:
        recs.append(
            Recommendation(
                key="water_routine",
                title="Сделать воду автоматической привычкой",
                why=f"Вода {sub['hydration']}/100 — это простой и быстрый апгрейд самочувствия.",
                next_step="Поставьте бутылку 0.5 л на рабочий стол и выпивайте 2 такие до 16:00.",
                priority=62,
                category="hydration",
            )
        )

    # Nutrition
    if sub["nutrition"] < 70:
        recs.append(
            Recommendation(
                key="nutrition_anchor",
                title="Якорный приём пищи",
                why="Стабильный один приём в день резко улучшает общий рацион без силы воли.",
                next_step="Ежедневно: белок + овощи + сложные углеводы (или фрукты) — в одном приёме.",
                priority=74,
                category="nutrition",
            )
        )

    if answers.fastfood_frequency in (
        FastFoodFrequency.OFTEN,
        FastFoodFrequency.VERY_OFTEN,
    ):
        recs.append(
            Recommendation(
                key="fastfood_stepdown",
                title="Снизить фастфуд на один шаг",
                why="Частый фастфуд повышает метаболическую нагрузку.",
                next_step="На ближайшие 14 дней: замените 1 фастфуд-приём на альтернативу (bowl/суп/салат+белок).",
                priority=79,
                category="nutrition",
            )
        )

    # Smoking
    if answers.smokes:
        recs.append(
            Recommendation(
                key="smoking_reduce",
                title="Сократить курение",
                why=f"Кардио-риск {cardio_risk}/100 частично формируется привычками.",
                next_step="Выберите шаг: минус 1 сиг/день или «окна без курения» до обеда.",
                priority=92,
                category="habits",
            )
        )

    # Activity
    if answers.workouts_per_week <= 1:
        recs.append(
            Recommendation(
                key="workouts_2x",
                title="Минимум эффективности: 2 тренировки/нед",
                why="С 2 тренировками прогресс становится предсказуемым.",
                next_step="2× по 35–45 минут: базовые упражнения на всё тело + прогулки в остальные дни.",
                priority=77,
                category="activity",
            )
        )
    elif answers.workouts_per_week >= 6 and (
        recovery_debt >= 55 or answers.sleep_hours < 7 or answers.stress_level >= 7
    ):
        recs.append(
            Recommendation(
                key="deload_week",
                title="Неделя разгрузки",
                why="Много тренировок на фоне сна/стресса часто накапливает долг восстановления.",
                next_step="1–2 дня замените на лёгкую активность: 30–45 мин ходьбы/мобилити.",
                priority=73,
                category="recovery",
            )
        )

    # Goal extras - contextual based on current activity level
    if answers.goal == Goal.FAT_LOSS:
        if answers.workouts_per_week >= 4:
            recs.append(
                Recommendation(
                    key="steps_goal",
                    title="Добавить низкоинтенсивное кардио",
                    why="При высокой частоте тренировок шаги/прогулки помогают сжигать калории без перегрузки.",
                    next_step="Добавьте 20–30 мин ходьбы в дни отдыха или после силовых.",
                    priority=58,
                    category="activity",
                )
            )
        else:
            recs.append(
                Recommendation(
                    key="steps_goal",
                    title="Добавить шаги",
                    why="Шаги увеличивают расход энергии без сильной нагрузки на восстановление.",
                    next_step="Цель на 10 дней: +2000 шагов к текущему уровню (или 7000–9000/день).",
                    priority=58,
                    category="activity",
                )
            )
    elif answers.goal == Goal.MASS_GAIN:
        if answers.workouts_per_week >= 3:
            recs.append(
                Recommendation(
                    key="strength_plan",
                    title="Прогрессия нагрузки",
                    why="Для набора массы важна прогрессия: постепенно увеличивайте веса/объём.",
                    next_step="Ведите дневник тренировок: фиксируйте веса и повторы, добавляйте понемногу.",
                    priority=60,
                    category="activity",
                )
            )
        else:
            recs.append(
                Recommendation(
                    key="strength_plan",
                    title="Силовой план с прогрессией",
                    why="Для набора массы нужны минимум 3 силовые тренировки в неделю.",
                    next_step="3×/нед: жим/тяга/присед (вариации) + ведите веса/повторы.",
                    priority=60,
                    category="activity",
                )
            )

    # Low confidence meta-rec
    if confidence < 70:
        recs.append(
            Recommendation(
                key="data_check",
                title="Уточнить ответы анкеты",
                why="Есть несостыковки/крайние значения — это снижает точность рекомендаций.",
                next_step="Проверьте сон/воду/тренировки и заполните заново — дашборд станет точнее.",
                priority=50,
                category="meta",
            )
        )

    # Sort by priority descending
    recs.sort(key=lambda x: x.priority, reverse=True)

    # Dedupe by key
    seen: set[str] = set()
    unique_recs: list[Recommendation] = []
    for r in recs:
        if r.key and r.key not in seen:
            seen.add(r.key)
            unique_recs.append(r)

    return unique_recs


# ---------- Main Function ----------

def generate_insights(answers: SurveyAnswers) -> Summary:
    """
    Main entry point - generate full insights summary from survey answers.
    This is the Python port of the Go GenerateInsights function.
    """
    # Validate and get data quality notes
    dq, notes = validate(answers)

    # Get name (with fallback)
    name = answers.name.strip() or "пользователь"

    # --- Atomic subscores (0..100) ---
    sub = {
        "activity": score_activity(answers.activity_level, answers.workouts_per_week),
        "sleep": score_sleep(answers.sleep_hours),
        "stress": score_stress(answers.stress_level),
        "hydration": score_hydration(answers.water_liters),
        "nutrition": score_nutrition(answers.fastfood_frequency),
        "smoking": score_smoking(answers.smokes),
        "age": score_age_modifier(answers.age),
    }

    # Weights (proprietary, tunable)
    weights = {
        "activity": 20,
        "sleep": 20,
        "stress": 18,
        "hydration": 10,
        "nutrition": 18,
        "smoking": 10,
        "age": 4,
    }

    health = weighted_average(sub, weights)

    # --- Derived components ---
    neat = score_neat(answers.activity_level, answers.workouts_per_week)
    recovery_debt = score_recovery_debt(
        answers.sleep_hours, answers.stress_level, answers.workouts_per_week
    )
    nutrition_stability = score_nutrition_stability(
        answers.fastfood_frequency, answers.stress_level
    )
    habit_score = clamp(
        int(
            round(
                0.45 * sub["nutrition"] + 0.35 * sub["smoking"] + 0.20 * sub["hydration"]
            )
        ),
        0,
        100,
    )

    activity_score = sub["activity"]

    recovery = clamp(
        int(
            round(
                0.55 * sub["sleep"]
                + 0.30 * sub["stress"]
                + 0.15 * balance_for_training_load(answers.workouts_per_week)
            )
        ),
        0,
        100,
    )

    lifestyle = clamp(
        int(
            round(
                0.22 * sub["sleep"]
                + 0.22 * sub["stress"]
                + 0.20 * sub["nutrition"]
                + 0.18 * sub["hydration"]
                + 0.18 * neat
            )
        ),
        0,
        100,
    )

    energy = clamp(
        int(
            round(0.40 * sub["sleep"] + 0.35 * sub["stress"] + 0.25 * sub["hydration"])
        ),
        0,
        100,
    )

    # "Bad" indices: higher means worse
    metabolic_load = clamp(
        int(
            round(
                0.45 * (100 - sub["nutrition"])
                + 0.25 * (100 - sub["activity"])
                + 0.15 * (100 - sub["sleep"])
                + 0.15 * (100 - sub["hydration"])
            )
        ),
        0,
        100,
    )

    cardio_risk = clamp(
        int(
            round(
                0.45 * bool_to_risk(answers.smokes)
                + 0.20 * (100 - sub["activity"])
                + 0.20 * age_risk(answers.age)
                + 0.15 * (100 - sub["sleep"])
            )
        ),
        0,
        100,
    )

    consistency = score_consistency(
        answers.workouts_per_week,
        answers.sleep_hours,
        answers.fastfood_frequency,
        answers.water_liters,
    )
    readiness = score_readiness(recovery, energy, cardio_risk, metabolic_load)
    confidence = score_confidence(answers, dq)

    # --- Charts data ---
    radar = [
        RadarPoint(key="activity", label="Активность", value=sub["activity"]),
        RadarPoint(key="neat", label="Движение (NEAT)", value=neat),
        RadarPoint(key="sleep", label="Сон", value=sub["sleep"]),
        RadarPoint(key="stress", label="Стресс", value=sub["stress"]),
        RadarPoint(key="hydration", label="Вода", value=sub["hydration"]),
        RadarPoint(key="nutrition", label="Питание", value=sub["nutrition"]),
        RadarPoint(key="habits", label="Привычки", value=habit_score),
    ]

    dim_bars = [
        ChartPoint(key="activity", label="Активность", value=sub["activity"]),
        ChartPoint(key="sleep", label="Сон", value=sub["sleep"]),
        ChartPoint(key="stress", label="Стресс", value=sub["stress"]),
        ChartPoint(key="hydration", label="Вода", value=sub["hydration"]),
        ChartPoint(key="nutrition", label="Питание", value=sub["nutrition"]),
        ChartPoint(key="habits", label="Привычки", value=habit_score),
    ]

    risk_comp = [
        ChartPoint(key="smoking_risk", label="Курение", value=bool_to_risk(answers.smokes)),
        ChartPoint(key="sleep_risk", label="Сон", value=100 - sub["sleep"]),
        ChartPoint(key="stress_risk", label="Стресс", value=100 - sub["stress"]),
        ChartPoint(key="activity_risk", label="Активность", value=100 - sub["activity"]),
        ChartPoint(key="nutrition_risk", label="Питание", value=100 - sub["nutrition"]),
    ]

    percentiles = build_percentiles(health, activity_score, recovery, lifestyle, cardio_risk)

    good = clamp(
        int(
            round(
                0.30 * health
                + 0.20 * recovery
                + 0.20 * lifestyle
                + 0.15 * energy
                + 0.15 * consistency
            )
        ),
        0,
        100,
    )
    donut = Donut(good=good, needs_work=100 - good)

    targets = build_targets(sub, neat, habit_score, recovery_debt, answers.workouts_per_week)

    # --- Text blocks ---
    flags = build_flags_and_alerts(
        answers, sub, recovery_debt, metabolic_load, cardio_risk, dq
    )
    strengths, improvements = build_strengths_and_improvements(
        answers, sub, neat, habit_score, recovery_debt, nutrition_stability
    )
    recs = build_recommendations(
        answers,
        sub,
        health,
        recovery,
        lifestyle,
        cardio_risk,
        metabolic_load,
        recovery_debt,
        confidence,
    )

    persona = persona_tag(health, consistency, cardio_risk, recovery_debt)

    # --- Build Gauges ---
    gauges = Gauges(
        health_index=health,
        activity_score=activity_score,
        recovery_quality=recovery,
        lifestyle_balance=lifestyle,
        energy_index=energy,
        metabolic_load=metabolic_load,
        cardio_risk=cardio_risk,
        consistency=consistency,
        readiness=readiness,
        confidence=confidence,
    )

    # --- Build Scores ---
    scores = Scores(
        activity=sub["activity"],
        sleep=sub["sleep"],
        stress=sub["stress"],
        hydration=sub["hydration"],
        nutrition=sub["nutrition"],
        smoking=sub["smoking"],
        age_modifier=sub["age"],
        movement_neat=neat,
        recovery_debt=recovery_debt,
        nutrition_stability=nutrition_stability,
        habit_score=habit_score,
    )

    # --- Build Charts ---
    charts = Charts(
        dimensions=dim_bars,
        good_vs_needs_work=donut,
        risk_composition=normalize_to_100(risk_comp),
        percentiles=percentiles,
        targets=targets,
    )

    # --- Build summary text ---
    summary_text = build_summary_text(name, answers, gauges, strengths, improvements)

    # --- Build Insight ---
    insight = Insight(
        summary_text=summary_text,
        strengths=strengths,
        improvement_areas=improvements,
        persona_tag=persona,
    )

    # --- Build Recommendations ---
    recommendations = Recommendations(
        top_3=recs[:3] if len(recs) >= 3 else recs,
        all=recs,
    )

    # --- Build Debug ---
    debug = Debug(
        sub_scores=sub,
        weights=weights,
        notes=notes,
    )

    # --- Build final Summary ---
    return Summary(
        user=UserInfo(name=name, age=answers.age, goal=answers.goal),
        gauges=gauges,
        scores=scores,
        radar=radar,
        charts=charts,
        insight=insight,
        recommendations=recommendations,
        flags=flags,
        debug=debug,
        generated_at=datetime.now(timezone.utc).isoformat(),
        version="insights.v2",
    )
