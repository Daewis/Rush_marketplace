import { Hero } from './Hero';
import { Services } from './Services';
import { HowItWorks } from './HowItWorks';
import { Testimonials } from './Testimonials';
import { Button } from '@/components/ui/button';
import { ArrowRight, LogIn, UserPlus, Sparkles, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

export function LandingPage() {
  const { setView } = useAppStore();

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <Hero />

      {/* Quick Action Banner for Auth */}
      <div className="bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-orange-500/20 max-w-7xl mx-auto my-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-bold uppercase tracking-wider border border-orange-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Campus Escrow & Dispatch Portal</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to request an artisan or dispatch rider?
            </h3>
            <p className="text-sm text-slate-300 max-w-xl">
              Sign in to your account or create a new profile with Google, email, or phone. Verified with NIN & BVN protection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              onClick={() => setView('login')}
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-6 h-11 text-xs sm:text-sm shadow-md cursor-pointer flex items-center gap-2"
            >
              <LogIn className="w-4 h-4 text-orange-600" />
              Sign In to Account
            </Button>
            <Button
              onClick={() => setView('register')}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold px-6 h-11 text-xs sm:text-sm shadow-md cursor-pointer flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Create Free Account
            </Button>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <Services />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Community Testimonials */}
      <Testimonials />

      {/* Bottom Guarantee Banner */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-md max-w-7xl mx-auto text-center space-y-4">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
          100% Campus Escrow Guarantee
        </h3>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Your payment stays held safely in escrow until your dispatch parcel arrives or your home service is finished. The artisan or rider only gets paid when you release the 4-digit OTP handshake.
        </p>
        <div className="pt-2 flex justify-center gap-4">
          <Button
            onClick={() => setView('register')}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 h-11 text-sm shadow-sm cursor-pointer"
          >
            Get Started Now <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
