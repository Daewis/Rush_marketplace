import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Quote, MapPin, CheckCircle2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

const testimonials = [
  {
    name: 'Chioma E.',
    role: 'Customer',
    location: 'Ikeja, Lagos',
    content: 'Needed an urgent motorcycle dispatch to send signed contracts across town during peak traffic. The driver arrived in 10 minutes and delivered seamlessly.',
    rating: 5,
    initials: 'CE',
    verified: true,
    tag: 'Dispatch & Express',
    color: 'from-orange-500 to-amber-600',
  },
  {
    name: 'Emeka O.',
    role: 'Customer',
    location: 'Lekki Phase 1',
    content: 'My office inverter blew a fuse on a Sunday. Found a certified electrician via RushNG who diagnosed and fixed it within two hours. Super reliable service!',
    rating: 5,
    initials: 'EO',
    verified: true,
    tag: 'Electrical Repair',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    name: 'Tunde A.',
    role: 'Verified Service Provider',
    location: 'Yaba, Lagos',
    content: 'As a skilled carpenter, finding steady jobs used to be tough. RushNG keeps my schedule full with verified clients and guarantees instant payout on completion.',
    rating: 5,
    initials: 'TA',
    verified: true,
    tag: 'Artisan Partner',
    color: 'from-emerald-500 to-teal-600',
  },
];

export function Testimonials() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-background">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 space-y-4"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold text-orange-600 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Community Feedback
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Trusted by{' '}
            <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 bg-clip-text text-transparent">
              Thousands
            </span>
            {' '}Daily
          </h2>

          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Real reviews from individuals and business owners relying on RushNG for instant courier dispatch and expert home repairs.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
            >
              <Card className="h-full border border-border/60 bg-card/50 backdrop-blur-sm hover:border-orange-500/40 hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                <CardContent className="p-6 md:p-7 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="secondary" 
                        className={`text-[10px] font-medium bg-gradient-to-r ${testimonial.color} text-white border-0 shadow-sm`}
                      >
                        {testimonial.tag}
                      </Badge>
                      <Quote className="h-5 w-5 text-orange-500/20 rotate-180" />
                    </div>

                    <div className="flex items-center gap-0.5">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>

                    <p className="text-muted-foreground text-xs md:text-sm leading-relaxed italic">
                      "{testimonial.content}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border/40 flex items-center gap-3 mt-4">
                    <Avatar className="h-10 w-10 border-2 border-orange-200">
                      <AvatarFallback className={`bg-gradient-to-br ${testimonial.color} text-white font-bold text-xs`}>
                        {testimonial.initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-foreground truncate">
                          {testimonial.name}
                        </p>
                        {testimonial.verified && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{testimonial.role}</span>
                        <span className="text-border">•</span>
                        <span className="inline-flex items-center gap-0.5 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {testimonial.location}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-6 md:gap-12"
        >
          {[
            { label: 'Happy Customers', value: '10,000+' },
            { label: '5-Star Reviews', value: '4,800+' },
            { label: 'Service Providers', value: '500+' },
            { label: 'Cities Covered', value: '15+' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-lg md:text-xl font-bold text-orange-600">{stat.value}</div>
              <div className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
