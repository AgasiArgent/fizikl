"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSurveyResults } from "@/lib/api";
import { SurveyRecord, Alert } from "@/lib/types";

function getScoreColor(value: number, inverse = false) {
  const score = inverse ? 100 - value : value;
  if (score >= 75) return "text-emerald-500";
  if (score >= 50) return "text-yellow-500";
  return "text-red-500";
}

function getHexColor(value: number, inverse = false) {
  const score = inverse ? 100 - value : value;
  if (score >= 75) return "#10b981";
  if (score >= 50) return "#eab308";
  return "#ef4444";
}

function getRiskLabel(value: number, inverse = false) {
  const score = inverse ? 100 - value : value;
  if (score >= 75) return "Низкий";
  if (score >= 50) return "Средний";
  return "Высокий";
}

function AnimatedNumber({ value, duration = 1 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.round(easeOutQuart * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <>{displayValue}</>;
}

function GaugeCard({
  label,
  value,
  subtitle,
  inverse = false,
  delay = 0,
}: {
  label: string;
  value: number;
  subtitle?: string;
  inverse?: boolean;
  delay?: number;
}) {
  const colorClass = getScoreColor(value, inverse);
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className="h-full"
    >
      <Card className="h-full">
        <CardContent className="pt-5 pb-5 text-center h-full flex flex-col justify-center">
          <p className="text-xs text-muted-foreground mb-1 whitespace-nowrap">{label}</p>
          {subtitle && subtitle !== "%" && (
            <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
          )}
          <p className={`text-4xl font-bold ${colorClass}`}>
            <AnimatedNumber value={value} duration={1.2} />
            {subtitle === "%" && <span>%</span>}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Custom Apple Watch style rings
function ActivityRings({
  data,
}: {
  data: { name: string; value: number; fill: string }[];
}) {
  const size = 160;
  const strokeWidth = 14;
  const gap = 4;
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((item, index) => {
        const radius = center - strokeWidth / 2 - (strokeWidth + gap) * index;
        const circumference = 2 * Math.PI * radius;
        const progress = (item.value / 100) * circumference;

        return (
          <g key={item.name}>
            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={item.fill}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${progress} ${circumference}`}
              transform={`rotate(-90 ${center} ${center})`}
              style={{
                transition: "stroke-dasharray 1s ease-out",
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function AlertCard({ alert, index = 0 }: { alert: Alert; index?: number }) {
  const severityStyles = {
    info: "bg-gray-50 border-gray-200 text-gray-800",
    warn: "bg-yellow-50 border-yellow-200 text-yellow-800",
    high: "bg-red-50 border-red-200 text-red-800",
  };

  const severityIcons = {
    info: "💡",
    warn: "⚠️",
    high: "🚨",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 + index * 0.15, ease: "easeOut" }}
      className={`p-4 rounded-lg border ${severityStyles[alert.severity]}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{severityIcons[alert.severity]}</span>
        <div>
          <p className="font-semibold">{alert.title}</p>
          <p className="text-sm mt-1 opacity-90">{alert.body}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Mini Donut component for risks
function MiniDonut({
  value,
  label,
  inverse = false,
}: {
  value: number;
  label: string;
  inverse?: boolean;
}) {
  // For inverse metrics: low value = good (green), high value = bad (red)
  // But we show the actual value, just with inverted colors
  const color = getHexColor(value, inverse);

  // For donut fill: show actual value percentage
  const data = [
    { value: value, color },
    { value: 100 - value, color: "#e5e7eb" },
  ];

  // Label for inverse: low is good
  const getLabel = () => {
    if (inverse) {
      if (value <= 25) return "Низкий";
      if (value <= 50) return "Средний";
      return "Высокий";
    }
    if (value >= 75) return "Высокий";
    if (value >= 50) return "Средний";
    return "Низкий";
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 relative shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={25}
              outerRadius={38}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>
            {value}
          </span>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color }}>
            {getLabel()}
          </span>
          {inverse && (
            <span className="text-xs text-muted-foreground">(меньше = лучше)</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<SurveyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getSurveyResults(id);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load results");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Загружаем результаты...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error || "Данные не найдены"}</p>
            <Link href="/">
              <Button>Вернуться на главную</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { results } = data;
  const { gauges, insight, recommendations, flags } = results;

  // 8 metrics for radar (excluding confidence and health_index which is общий)
  const radarData = [
    { subject: "Готовность", value: gauges.readiness },
    { subject: "Энергия", value: gauges.energy_index },
    { subject: "Активность", value: gauges.activity_score },
    { subject: "Восстановление", value: gauges.recovery_quality },
    { subject: "Стабильность", value: gauges.consistency },
    { subject: "Баланс", value: gauges.lifestyle_balance },
    { subject: "Кардио-риск", value: 100 - gauges.cardio_risk }, // Invert for radar (higher = better)
    { subject: "Метаболизм", value: 100 - gauges.metabolic_load }, // Invert for radar (higher = better)
  ];

  // Sort alerts: high first, then warn, then info
  const sortedAlerts = [...flags.alerts].sort((a, b) => {
    const order = { high: 0, warn: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  // Calculate average radar value for color
  const avgRadarValue = radarData.reduce((sum, p) => sum + p.value, 0) / radarData.length;

  // Activity rings data (outer to inner)
  const activityRecoveryData = [
    { name: "Активность", value: gauges.activity_score, fill: "#10b981" },
    { name: "Восстановление", value: gauges.recovery_quality, fill: "#3b82f6" },
    { name: "Стабильность", value: gauges.consistency, fill: "#8b5cf6" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8 px-4">
      <div className="container mx-auto max-w-5xl">
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

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Результаты для {results.user.name}
          </h1>
          <p className="text-muted-foreground">
            Цель: {results.user.goal} • Возраст: {results.user.age}
          </p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-sm text-muted-foreground mt-2"
          >
            {insight.persona_tag}
          </motion.p>
        </motion.div>

        {/* Main Gauges */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <GaugeCard
            label="Индекс здоровья"
            value={gauges.health_index}
            subtitle="0-100"
            delay={0.2}
          />
          <GaugeCard
            label="Готовность"
            value={gauges.readiness}
            subtitle="к нагрузкам"
            delay={0.3}
          />
          <GaugeCard
            label="Энергия"
            value={gauges.energy_index}
            delay={0.4}
          />
        </div>

        {/* Alerts - sorted by severity */}
        {sortedAlerts.length > 0 && (
          <div className="space-y-2 mb-5">
            {sortedAlerts.map((alert, index) => (
              <AlertCard key={alert.key} alert={alert} index={index} />
            ))}
          </div>
        )}

        {/* Activity & Recovery - RadialBar + Balance & Risks - 3 Donuts */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
          className="grid md:grid-cols-2 gap-4 mb-5"
        >
          {/* Activity & Recovery - RadialBar Apple Watch style */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Активность и восстановление</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-40 h-40 flex items-center justify-center">
                  <ActivityRings data={activityRecoveryData} />
                </div>
                <div className="flex-1 space-y-3">
                  {activityRecoveryData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-sm flex-1">{item.name}</span>
                      <span className="text-sm font-bold" style={{ color: item.fill }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Balance & Risks - 3 Mini Donuts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Баланс и риски</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <MiniDonut
                  value={gauges.lifestyle_balance}
                  label="Баланс образа жизни"
                />
                <MiniDonut
                  value={gauges.cardio_risk}
                  label="Кардио-риск"
                  inverse
                />
                <MiniDonut
                  value={gauges.metabolic_load}
                  label="Метаболическая нагрузка"
                  inverse
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Health Profile - Radar */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
        >
          <Card className="mb-5">
            <CardHeader>
              <CardTitle>Профиль здоровья</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Radar Chart */}
                <div className="w-full md:flex-1 h-[280px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%">
                      <PolarGrid />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fontSize: 10 }}
                      />
                      <Radar
                        name="Значение"
                        dataKey="value"
                        stroke={getHexColor(avgRadarValue)}
                        fill={getHexColor(avgRadarValue)}
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                {/* Definitions with values */}
                <div className="w-full md:w-72 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span className="font-medium">Здоровье</span>
                      <span className="text-muted-foreground text-xs">— общий индекс</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(gauges.health_index)}`}>{gauges.health_index}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span className="font-medium">Готовность</span>
                      <span className="text-muted-foreground text-xs">— к нагрузкам</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(gauges.readiness)}`}>{gauges.readiness}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span className="font-medium">Энергия</span>
                      <span className="text-muted-foreground text-xs">— сон+стресс+вода</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(gauges.energy_index)}`}>{gauges.energy_index}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span className="font-medium">Активность</span>
                      <span className="text-muted-foreground text-xs">— движение</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(gauges.activity_score)}`}>{gauges.activity_score}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span className="font-medium">Восстановление</span>
                      <span className="text-muted-foreground text-xs">— отдых</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(gauges.recovery_quality)}`}>{gauges.recovery_quality}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span className="font-medium">Стабильность</span>
                      <span className="text-muted-foreground text-xs">— привычки</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(gauges.consistency)}`}>{gauges.consistency}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span className="font-medium">Баланс</span>
                      <span className="text-muted-foreground text-xs">— образ жизни</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(gauges.lifestyle_balance)}`}>{gauges.lifestyle_balance}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span className="font-medium">Кардио-риск</span>
                      <span className="text-muted-foreground text-xs">— ↓лучше</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(gauges.cardio_risk, true)}`}>{gauges.cardio_risk}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span className="font-medium">Метаболизм</span>
                      <span className="text-muted-foreground text-xs">— ↓лучше</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(gauges.metabolic_load, true)}`}>{gauges.metabolic_load}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Strengths & Improvements */}
        {(insight.strengths.length > 0 || insight.improvement_areas.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className={`grid gap-4 mb-5 ${
              insight.strengths.length > 0 && insight.improvement_areas.length > 0
                ? "md:grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {insight.strengths.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    Сильные стороны
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {insight.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">•</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {insight.improvement_areas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-yellow-500">↑</span>
                    Зоны роста
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {insight.improvement_areas.map((area, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-yellow-500 mt-1">•</span>
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* All Recommendations in one card */}
        {recommendations.all.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
          >
            <Card className="mb-5">
              <CardHeader>
                <CardTitle>Рекомендации</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {recommendations.all.map((rec, i) => (
                    <div key={rec.key} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${
                          i < 3
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {i + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold">{rec.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {rec.why}
                          </p>
                          <p className="text-sm mt-2 p-2 bg-accent rounded">
                            <span className="font-medium">Шаг:</span> {rec.next_step}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* CTA Block */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.1 }}
        >
          <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-5 text-center">
              <h2 className="text-xl font-bold mb-2">
                Мы поможем вам улучшить свои результаты
              </h2>
              <p className="text-muted-foreground text-sm mb-4 max-w-lg mx-auto">
                Получите персональный план тренировок и питания
              </p>
              <Button size="default" className="px-6">
                Получить персональный план
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/survey">
            <Button variant="outline" className="w-full sm:w-auto">
              Пройти снова
            </Button>
          </Link>
          <Link href="/">
            <Button className="w-full sm:w-auto">На главную</Button>
          </Link>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.3 }}
          className="text-center mt-8 text-sm text-muted-foreground"
        >
          <p>
            Данные не являются медицинской консультацией.
            При наличии проблем со здоровьем обратитесь к врачу.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
