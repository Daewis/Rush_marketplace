import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff, AlertCircle, Mail, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app-store';

export function LoginForm() {
  const { setView } = useAppStore();
  const { login, googleLogin, loginLoading, googleLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email || !formData.password) {
      setError('Please enter both your email address and password.');
      return;
    }

    try {
      const res = await login(formData.email, formData.password);
      if (!res.success) {
        setError(res.error || 'Authentication failed. Please check credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed.');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    await googleLogin();
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-xl border border-slate-200">
      <div className="text-center mb-6 space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">Welcome Back to RUSHNG</h2>
        <p className="text-xs text-slate-500">Sign in to manage campus deliveries, escrows & jobs</p>
      </div>

      {/* Google Sign-In Option */}
      <div className="space-y-4">
        <Button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loginLoading}
          variant="outline"
          className="w-full h-11 border-slate-300 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Continue with Google</span>
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-[11px] tracking-wider text-slate-400 font-semibold">
              or sign in with email
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>Sign In Notice</span>
            </div>
            <p className="pl-6 text-red-600 leading-relaxed">{error}</p>
            {error.toLowerCase().includes('popup') && (
              <p className="pl-6 text-[11px] text-slate-500 pt-1 font-medium">
                💡 <strong>Tip:</strong> Click the popup-block icon in your browser's address bar to allow popups, or open this page in a new tab.
              </p>
            )}
          </motion.div>
        )}

        {/* Email Input */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
            <Input
              id="email"
              type="email"
              placeholder="student@unilag.edu.ng"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loginLoading || googleLoading}
              className="h-11 pl-10 focus-visible:ring-amber-500"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
            <button
              type="button"
              onClick={() => toast.info('Please contact support to reset password.')}
              className="text-xs text-amber-600 hover:underline font-medium transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={loginLoading || googleLoading}
              className="h-11 pl-10 pr-12 focus-visible:ring-amber-500"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center space-x-2 pt-1">
          <Checkbox
            id="remember"
            checked={formData.remember}
            onCheckedChange={(checked) => setFormData({ ...formData, remember: Boolean(checked) })}
          />
          <Label htmlFor="remember" className="text-xs font-normal cursor-pointer text-slate-600 select-none">
            Keep me logged in
          </Label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all text-sm mt-2"
          disabled={loginLoading || googleLoading}
        >
          {loginLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        {/* Sign Up Link */}
        <p className="text-center text-xs text-slate-500 pt-3 border-t border-slate-100">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => setView('register')}
            className="font-bold text-amber-600 hover:underline cursor-pointer"
          >
            Create an Account
          </button>
        </p>
      </form>
    </div>
  );
}
