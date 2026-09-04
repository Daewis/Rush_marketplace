import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, UserCheck, Star, ShieldCheck, ArrowRight, Sparkles, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '@/store/app-store';

const steps = [
  {
    stepNumber: '01',
    icon: Search,
    title: 'Find a Service',
    description: 'Browse available dispatch riders and verified artisans in your vicinity.',
    color: 'from-orange-500 to-amber-600',
    bgColor: 'bg-orange-100 dark:bg-orange-950/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    stepNumber: '02',
    icon: UserCheck,
    title: 'Connect with Providers',
    description: 'Get matched automatically with vetted local professionals ready to deliver.',
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-100 dark:bg-blue-950/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    stepNumber: '03',
    icon: Star,
    title: 'Get Quality Service',
    description: 'Track progress live, complete safe escrow payouts, and leave provider reviews.',
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-950/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    stepNumber: '04',
    icon: ShieldCheck,
    title: 'Stay Protected',
    description: 'Every job is covered by escrow guarantee and verified identity checks.',
    color: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-100 dark:bg-purple-950/40',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
];

export function HowItWorks() {
  const { setView } = useAppStore();

  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/20">
      <div className="container mx-auto px-4 md:px-6 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16 space-y-4"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold text-orange-600 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Simple Workflow
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
            How{' '}
            <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 bg-clip-text text-transparent">
              RushNG
            </span>
            {' '}Works
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Get your deliveries sent or home services booked in four easy steps.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="relative"
              >
                <Card className="group relative h-full p-6 text-center border-border/60 hover:border-orange-500/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 bg-card/50 backdrop-blur-sm overflow-hidden">
                  <div className="absolute top-4 right-4 text-xs font-mono font-bold text-muted-foreground/30 group-hover:text-orange-500/60 transition-colors">
                    {step.stepNumber}
                  </div>

                  <div className={`relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${step.bgColor} transition-all duration-300 group-hover:scale-110`}>
                    <Icon className={`h-7 w-7 ${step.iconColor} relative z-10`} />
                  </div>

                  <h3 className="text-base font-bold mb-2 text-foreground group-hover:text-orange-600 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-14 text-center"
        >
          <div className="inline-flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Get started in under 2 minutes</span>
          </div>
          <div>
            <Button
              size="lg"
              onClick={() => setView('jobs')}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 h-12 px-8"
            >
              Get Started Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
