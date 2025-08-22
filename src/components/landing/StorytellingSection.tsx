import { motion } from "framer-motion";
import { Users, Target, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: Users,
    title: "Create Group",
    description: "Invite friends and form an accountability circle",
    illustration: "👥",
    color: "hsl(var(--chart-pastel-1))"
  },
  {
    icon: Target,
    title: "Start Challenge",
    description: "Set habits, penalties, and strike allowances",
    illustration: "🎯",
    color: "hsl(var(--chart-pastel-2))"
  },
  {
    icon: TrendingUp,
    title: "Compete & Track",
    description: "Log results, track progress, and stay motivated",
    illustration: "📊",
    color: "hsl(var(--chart-pastel-3))"
  }
];

interface StorytellingSectionProps {
  id?: string;
}

export function StorytellingSection({ id = "how-it-works" }: StorytellingSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started in three simple steps and build lasting habits with your friends
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="relative"
            >
              <Card className="h-full bg-card/50 backdrop-blur-sm border-2 border-border/50 overflow-hidden">
                <CardContent className="p-8 text-center">
                  {/* Step Number */}
                  <motion.div
                    className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    {index + 1}
                  </motion.div>

                  {/* Illustration */}
                  <motion.div
                    className="text-6xl mb-6"
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {step.illustration}
                  </motion.div>

                  {/* Icon */}
                  <motion.div
                    className="inline-flex p-3 rounded-full mb-4"
                    style={{ backgroundColor: `${step.color}20` }}
                    whileHover={{ boxShadow: `0 0 20px ${step.color}40` }}
                  >
                    <step.icon className="w-6 h-6" style={{ color: step.color }} />
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>

                  {/* Hover Effect Background */}
                  <motion.div
                    className="absolute inset-0 opacity-0 bg-gradient-to-br from-primary/5 to-accent/5 -z-10"
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </CardContent>
              </Card>

              {/* Connection Line (except for last card) */}
              {index < steps.length - 1 && (
                <motion.div
                  className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 + 0.3 }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}