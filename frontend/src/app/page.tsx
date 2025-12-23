"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: "📊",
    title: "10 простых вопросов",
    description: "Опрос займёт всего 2 минуты вашего времени",
  },
  {
    icon: "🎯",
    title: "Персональный анализ",
    description: "Алгоритм учитывает все аспекты вашего образа жизни",
  },
  {
    icon: "📈",
    title: "Визуальный дашборд",
    description: "Графики, метрики и рекомендации в одном месте",
  },
  {
    icon: "💡",
    title: "Практические советы",
    description: "Конкретные шаги для улучшения здоровья",
  },
];

const metrics = [
  { label: "Индекс здоровья", color: "bg-emerald-500" },
  { label: "Активность", color: "bg-emerald-400" },
  { label: "Восстановление", color: "bg-blue-500" },
  { label: "Баланс", color: "bg-purple-500" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header with Logo */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-6"
      >
        <div className="flex justify-center">
          <Image
            src="/logo.svg"
            alt="Fizikl"
            width={56}
            height={56}
            priority
          />
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-6 pb-12 text-center">
        <div className="max-w-3xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
          >
            Узнайте свой{" "}
            <span className="text-primary">индекс здоровья</span>
            <br />
            за 2 минуты
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            Ответьте на 10 вопросов о вашем образе жизни и получите
            персонализированные инсайты, рекомендации и визуальный дашборд
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/survey">
              <Button size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">
                Начать опрос
              </Button>
            </Link>
          </motion.div>

          {/* Preview metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border text-sm"
              >
                <div className={`w-2 h-2 rounded-full ${metric.color}`} />
                {metric.label}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-bold text-center mb-8"
        >
          Как это работает
        </motion.h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="border-0 shadow-sm bg-card/50 h-full">
                <CardContent className="pt-6">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* What you'll get Section */}
      <section className="container mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto bg-card rounded-2xl p-8 md:p-12 shadow-sm border"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
            Что вы получите
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                  1
                </span>
                Комплексный анализ
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Индекс здоровья (0-100)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Оценка восстановления и энергии
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Анализ кардио-рисков
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Баланс образа жизни
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                  2
                </span>
                Персональные рекомендации
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Топ-3 приоритетных действия
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Конкретные шаги для улучшения
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Предупреждения о рисках
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Цели для следующего уровня
                </li>
              </ul>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-10 text-center"
          >
            <Link href="/survey">
              <Button size="lg" className="text-lg px-8">
                Пройти опрос бесплатно
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 text-center text-muted-foreground text-sm"
      >
        <p>
          Данные не являются медицинской консультацией.
          <br />
          При наличии проблем со здоровьем обратитесь к врачу.
        </p>
      </motion.footer>
    </main>
  );
}
