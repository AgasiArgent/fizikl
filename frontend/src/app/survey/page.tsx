"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitSurvey } from "@/lib/api";
import {
  SurveyAnswers,
  ActivityLevel,
  Goal,
  FastFoodFrequency,
} from "@/lib/types";

const TOTAL_STEPS = 10;

const activityLevels: { value: ActivityLevel; label: string }[] = [
  { value: "Низкий", label: "Низкий (сидячая работа, мало движения)" },
  { value: "Средний", label: "Средний (прогулки, лёгкая активность)" },
  { value: "Высокий", label: "Высокий (регулярные тренировки)" },
  { value: "Очень высокий", label: "Очень высокий (интенсивные тренировки)" },
];

const goals: { value: Goal; label: string }[] = [
  { value: "Похудение", label: "Похудение" },
  { value: "Набор массы", label: "Набор массы" },
  { value: "Поддержание формы", label: "Поддержание формы" },
  { value: "Улучшение здоровья", label: "Улучшение здоровья" },
];

const fastfoodOptions: { value: FastFoodFrequency; label: string }[] = [
  { value: "Никогда", label: "Никогда" },
  { value: "Редко", label: "Редко (1-2 раза в месяц)" },
  { value: "Иногда", label: "Иногда (раз в неделю)" },
  { value: "Часто", label: "Часто (несколько раз в неделю)" },
  { value: "Очень часто", label: "Очень часто (почти каждый день)" },
];

export default function SurveyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Partial<SurveyAnswers>>({
    name: "",
    age: 30,
    activity_level: "Средний",
    goal: "Улучшение здоровья",
    workouts_per_week: 2,
    sleep_hours: 7,
    stress_level: 5,
    water_liters: 1.5,
    fastfood_frequency: "Иногда",
    smokes: false,
  });

  const progress = (step / TOTAL_STEPS) * 100;

  const canProceed = () => {
    switch (step) {
      case 1:
        return answers.name && answers.name.trim().length > 0;
      case 2:
        return answers.age && answers.age >= 18 && answers.age <= 80;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await submitSurvey(answers as SurveyAnswers);
      router.push(`/results/${response.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <Label htmlFor="name" className="text-lg">
              Как вас зовут?
            </Label>
            <Input
              id="name"
              placeholder="Введите имя"
              value={answers.name}
              onChange={(e) => setAnswers({ ...answers, name: e.target.value })}
              className="text-lg py-6"
              autoFocus
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Label htmlFor="age" className="text-lg">
              Сколько вам лет?
            </Label>
            <Input
              id="age"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={answers.age === 0 ? "" : answers.age}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setAnswers({ ...answers, age: 0 });
                } else {
                  const num = parseInt(val);
                  if (!isNaN(num) && num >= 0 && num <= 99) {
                    setAnswers({ ...answers, age: num });
                  }
                }
              }}
              onBlur={() => {
                if (!answers.age || answers.age < 18) {
                  setAnswers({ ...answers, age: 18 });
                } else if (answers.age > 80) {
                  setAnswers({ ...answers, age: 80 });
                }
              }}
              className="text-lg py-6"
            />
            <p className="text-sm text-muted-foreground">От 18 до 80 лет</p>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Label className="text-lg">Ваш уровень физической активности</Label>
            <RadioGroup
              value={answers.activity_level}
              onValueChange={(value) =>
                setAnswers({ ...answers, activity_level: value as ActivityLevel })
              }
              className="space-y-3"
            >
              {activityLevels.map((level) => (
                <label
                  key={level.value}
                  htmlFor={level.value}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                >
                  <RadioGroupItem value={level.value} id={level.value} />
                  <span className="flex-1">{level.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <Label className="text-lg">Ваша цель</Label>
            <RadioGroup
              value={answers.goal}
              onValueChange={(value) =>
                setAnswers({ ...answers, goal: value as Goal })
              }
              className="space-y-3"
            >
              {goals.map((goal) => (
                <label
                  key={goal.value}
                  htmlFor={goal.value}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                >
                  <RadioGroupItem value={goal.value} id={goal.value} />
                  <span className="flex-1">{goal.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <Label className="text-lg">
              Сколько тренировок в неделю?
            </Label>
            <div className="flex items-center justify-center">
              <span className="text-6xl font-bold text-primary">
                {answers.workouts_per_week}
              </span>
            </div>
            <Slider
              value={[answers.workouts_per_week || 0]}
              onValueChange={(value) =>
                setAnswers({ ...answers, workouts_per_week: value[0] })
              }
              min={0}
              max={7}
              step={1}
              className="py-4"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0</span>
              <span>7</span>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <Label className="text-lg">
              Сколько часов вы спите в среднем?
            </Label>
            <div className="flex items-center justify-center">
              <span className="text-6xl font-bold text-primary">
                {answers.sleep_hours}
              </span>
              <span className="text-2xl text-muted-foreground ml-2">ч</span>
            </div>
            <Slider
              value={[answers.sleep_hours || 7]}
              onValueChange={(value) =>
                setAnswers({ ...answers, sleep_hours: value[0] })
              }
              min={4}
              max={12}
              step={0.5}
              className="py-4"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>4 ч</span>
              <span>12 ч</span>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <Label className="text-lg">
              Оцените ваш уровень стресса
            </Label>
            <div className="flex items-center justify-center">
              <span className="text-6xl font-bold text-primary">
                {answers.stress_level}
              </span>
              <span className="text-2xl text-muted-foreground ml-2">/10</span>
            </div>
            <Slider
              value={[answers.stress_level || 5]}
              onValueChange={(value) =>
                setAnswers({ ...answers, stress_level: value[0] })
              }
              min={1}
              max={10}
              step={1}
              className="py-4"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1 (низкий)</span>
              <span>10 (высокий)</span>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <Label className="text-lg">
              Сколько воды вы пьёте в день?
            </Label>
            <div className="flex items-center justify-center">
              <span className="text-6xl font-bold text-primary">
                {answers.water_liters}
              </span>
              <span className="text-2xl text-muted-foreground ml-2">л</span>
            </div>
            <Slider
              value={[answers.water_liters ?? 1.5]}
              onValueChange={(value) =>
                setAnswers({ ...answers, water_liters: value[0] })
              }
              min={0}
              max={5}
              step={0.5}
              className="py-4"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0 л</span>
              <span>5 л</span>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-4">
            <Label className="text-lg">Как часто вы едите фастфуд?</Label>
            <Select
              value={answers.fastfood_frequency}
              onValueChange={(value) =>
                setAnswers({
                  ...answers,
                  fastfood_frequency: value as FastFoodFrequency,
                })
              }
            >
              <SelectTrigger className="text-lg py-6">
                <SelectValue placeholder="Выберите вариант" />
              </SelectTrigger>
              <SelectContent>
                {fastfoodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 10:
        return (
          <div className="space-y-6">
            <Label className="text-lg">Вы курите?</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setAnswers({ ...answers, smokes: false })}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${
                  answers.smokes === false
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                <p className="font-medium text-lg">Нет</p>
                <p className="text-sm text-muted-foreground mt-1">Не курю</p>
              </button>
              <button
                type="button"
                onClick={() => setAnswers({ ...answers, smokes: true })}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${
                  answers.smokes === true
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                <p className="font-medium text-lg">Да</p>
                <p className="text-sm text-muted-foreground mt-1">Курю</p>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = [
    "Знакомство",
    "Возраст",
    "Активность",
    "Цель",
    "Тренировки",
    "Сон",
    "Стресс",
    "Вода",
    "Питание",
    "Привычки",
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8 px-4">
      <div className="container mx-auto max-w-xl">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="Fizikl"
              width={44}
              height={44}
              priority
            />
          </Link>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Вопрос {step} из {TOTAL_STEPS}
            </span>
            <span className="text-sm font-medium">{stepTitles[step - 1]}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">{stepTitles[step - 1]}</CardTitle>
          </CardHeader>
          <CardContent className="pb-8">{renderStep()}</CardContent>
        </Card>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex gap-4">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              className="flex-1"
            >
              Назад
            </Button>
          )}

          {step < TOTAL_STEPS ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1"
            >
              Далее
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Анализируем..." : "Получить результаты"}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
