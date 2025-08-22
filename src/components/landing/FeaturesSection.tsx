import { motion } from "framer-motion";
import { 
  Users, 
  Target, 
  BarChart3, 
  Coins, 
  BookOpen, 
  Lightbulb 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Users,
    title: "Groups",
    description: "Create accountability circles with friends and family",
    gradient: "from-chart-pastel-1 to-chart-pastel-2",
    illustration: "👥"
  },
  {
    icon: Target,
    title: "Challenges",
    description: "Set daily or weekly habits with flexible penalties",
    gradient: "from-chart-pastel-2 to-chart-pastel-3",
    illustration: "🎯"
  },
  {
    icon: BarChart3,
    title: "Logging",
    description: "Quick tap to log success or failure with real-time tracking",
    gradient: "from-chart-pastel-3 to-chart-pastel-4",
    illustration: "📊"
  },
  {
    icon: Coins,
    title: "Ledger",
    description: "Friendly penalty system with transparent accounting",
    gradient: "from-chart-pastel-4 to-chart-pastel-5",
    illustration: "💰"
  },
  {
    icon: BookOpen,
    title: "Journal",
    description: "Daily reflections and progress notes for deeper insights",
    gradient: "from-chart-pastel-5 to-chart-pastel-6",
    illustration: "📔"
  },
  {
    icon: Lightbulb,
    title: "Ideas & Voting",
    description: "Collaborative idea library with group voting system",
    gradient: "from-chart-pastel-6 to-chart-pastel-1",
    illustration: "💡"
  }
];

interface FeaturesSectionProps {
  id?: string;
}

export function FeaturesSection({ id = "features" }: FeaturesSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 py-20 bg-background">
      <div className="container">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to succeed
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A complete toolkit for building habits, staying accountable, and achieving your goals together
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="group"
            >
              <Card className="h-full bg-card/50 backdrop-blur-sm border-2 border-border/50 overflow-hidden relative">
                <CardContent className="p-6">
                  {/* Background Gradient */}
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                    initial={false}
                  />

                  {/* Illustration */}
                  <motion.div
                    className="text-4xl mb-4"
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {feature.illustration}
                  </motion.div>

                  {/* Icon */}
                  <motion.div
                    className="inline-flex p-3 rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors duration-300"
                    whileHover={{ scale: 1.1 }}
                  >
                    <feature.icon className="w-6 h-6 text-primary" />
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Hover Glow Effect */}
                  <motion.div
                    className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none"
                    style={{
                      background: `linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.1))`,
                      boxShadow: '0 0 30px hsl(var(--primary) / 0.2)'
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Call-to-Action */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p className="text-muted-foreground mb-6">
            Ready to transform your habits with friends?
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <a
              href="/auth"
              className="inline-flex items-center px-8 py-3 text-lg font-semibold text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-colors duration-300 shadow-lg hover:shadow-xl"
            >
              Start your first Challenge
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}