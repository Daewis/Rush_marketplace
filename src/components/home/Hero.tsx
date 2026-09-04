import { Button } from '@/components/ui/button';
import { ArrowRight, Star, Briefcase, CheckCircle2, Sparkles, Zap, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';

export function Hero() {
  const { setView } = useAppStore();
  const [currentProviderIndex, setCurrentProviderIndex] = useState(0);

  const sampleProviders = [
    { name: 'Chidi E.', service: 'Plumbing & Dispatch', rating: 4.9, distance: '2.3km', verified: true },
    { name: 'Amina B.', service: 'Electrical Maintenance', rating: 4.8, distance: '3.1km', verified: true },
    { name: 'Tunde O.', service: 'Carpentry & Logistics', rating: 4.7, distance: '1.8km', verified: true },
    { name: 'Ngozi O.', service: 'Cleaning Services', rating: 4.9, distance: '0.9km', verified: true },
    { name: 'Segun A.', service: 'Painting & Decor', rating: 4.6, distance: '2.7km', verified: true },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProviderIndex((prev) => (prev + 1) % sampleProviders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [sampleProviders.length]);

  const currentProvider = sampleProviders[currentProviderIndex];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-orange-50/50 via-background to-amber-50/30 dark:from-orange-950/20 dark:via-background dark:to-amber-950/10 pt-16 md:pt-24 pb-20 md:pb-28">
      {/* Animated Background Decorations */}
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-orange-500/10 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-3xl animate-pulse" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-6 text-left"
          >
            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs md:text-sm font-semibold text-orange-600 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Trusted by 50,000+ Nigerians</span>
              <span className="w-1 h-1 rounded-full bg-orange-500/30" />
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">100% Verified</span>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              Find Trusted{' '}
              <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent relative">
                Service Providers
              </span>
              <br />
              <span className="text-foreground">Near You</span>
            </motion.h1>

            {/* Description */}
            <motion.p 
              className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Connect with verified campus & local dispatch riders, plumbers, electricians, and artisans. 
              Get quality, reliable service delivered straight to your location.
            </motion.p>

            {/* Action Buttons */}
            <motion.div 
              className="flex flex-wrap items-center gap-4 pt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Button 
                size="lg" 
                onClick={() => setView('jobs')}
                className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 h-12 px-6"
              >
                Find a Service
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => setView('register')}
                className="h-12 px-6 border-2 border-orange-200 hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 font-medium"
              >
                Become a Provider
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div 
              className="grid grid-cols-3 gap-4 pt-8 border-t border-border/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {[
                { value: '10K+', label: 'Verified Providers', icon: Briefcase },
                { value: '50K+', label: 'Jobs Delivered', icon: CheckCircle2 },
                { value: '4.8★', label: 'Average Rating', icon: Star },
              ].map((stat, idx) => (
                <motion.div 
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + idx * 0.1 }}
                  className="group"
                >
                  <div className="text-2xl md:text-3xl font-bold tracking-tight text-orange-600 group-hover:scale-105 transition-transform">
                    {stat.value}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground font-medium flex items-center gap-1">
                    <stat.icon className="h-3.5 w-3.5 text-orange-500" />
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Live Preview Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="relative lg:ml-auto w-full max-w-md lg:max-w-none"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50">
              <div className="bg-gradient-to-br from-orange-500 via-amber-600 to-orange-700 p-6 md:p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shrink-0 border border-white/10">
                      <Briefcase className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">Nearby Professionals</h3>
                      <p className="text-xs text-white/80 flex items-center gap-1">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                        </span>
                        Active now in your area
                      </p>
                    </div>
                  </div>

                  {/* Animated Provider Card */}
                  <motion.div
                    key={currentProviderIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-xl bg-white/10 backdrop-blur-md p-4 border border-white/10 hover:bg-white/20 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm leading-tight">{currentProvider.name}</p>
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-300" />
                        </div>
                        <p className="text-xs text-white/80">{currentProvider.service}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-xs font-semibold">
                          <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                          <span>{currentProvider.rating}</span>
                        </div>
                        <p className="text-[11px] text-white/70 mt-0.5">{currentProvider.distance}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Provider Navigation Dots */}
                  <div className="flex justify-center gap-1.5 mt-4">
                    {sampleProviders.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentProviderIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === currentProviderIndex 
                            ? 'w-6 bg-white' 
                            : 'w-1.5 bg-white/40 hover:bg-white/60'
                        }`}
                        aria-label={`View provider ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <p className="mt-6 text-center text-xs font-medium text-white/80">
                    Trusted by thousands of customers daily
                  </p>
                </div>
              </div>
            </div>

            {/* Floating Status Badges */}
            <motion.div
              animate={{ y: [-6, 6, -6] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-4 -right-2 md:-right-4 rounded-xl bg-card border border-border p-3 shadow-xl backdrop-blur-md hidden sm:block"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground leading-none">100% Verified</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Identity & NIN Checked</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [6, -6, 6] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -bottom-4 -left-2 md:-left-4 rounded-xl bg-card border border-border p-3 shadow-xl backdrop-blur-md hidden sm:block"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground leading-none">Quick Response</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Average 8 min response</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
