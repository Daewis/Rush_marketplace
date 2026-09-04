import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  User,
  Briefcase,
  ArrowRight,
  Mail,
  Phone,
  Lock,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app-store';
import { campusHubs } from '@/data/seedData';

interface FieldErrors {
  full_name?: string;
  email?: string;
  phone?: string;
  campus_hub?: string;
  password?: string;
  confirm_password?: string;
}

const getPasswordStrength = (password: string) => {
  if (!password) {
    return { score: 0, label: 'Password strength', color: 'text-slate-400' };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const strengthMap = [
    { label: 'Very Weak', color: 'text-red-500' },
    { label: 'Weak password', color: 'text-red-400' },
    { label: 'Fair password', color: 'text-orange-500' },
    { label: 'Good password', color: 'text-amber-500' },
    { label: 'Strong password', color: 'text-emerald-500' },
  ];

  return {
    score,
    label: strengthMap[score].label,
    color: strengthMap[score].color,
  };
};

export function RegisterForm() {
  const { setView } = useAppStore();
  const { register, googleLogin, registerLoading, googleLoading, error: authError } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    campus_hub: '',
    password: '',
    confirm_password: '',
    role: 'customer',
  });

  const passwordStrength = getPasswordStrength(formData.password);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    if (!formData.full_name.trim()) {
      errors.full_name = 'Please enter your full name';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone.replace(/\s+/g, ''))) {
      errors.phone = 'Enter a valid Nigerian number (e.g., 08012345678)';
    }

    if (!formData.campus_hub) {
      errors.campus_hub = 'Please select your campus hub / institution';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Must contain uppercase, lowercase, and a number';
    }

    if (!formData.confirm_password) {
      errors.confirm_password = 'Please confirm your password';
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the errors in the form');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const success = await register({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        campus_hub: formData.campus_hub,
        campusHub: formData.campus_hub,
        password: formData.password,
        role: formData.role,
      });

      if (success) {
        toast.success('Account created successfully! 🎉');
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'An unexpected error occurred');
    }
  };

  const handleGoogleSignup = async () => {
    await googleLogin();
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-xl border border-slate-200">
      <div className="text-center mb-6 space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">Create RUSHNG Account</h2>
        <p className="text-xs text-slate-500">
          Join the campus dispatch and escrow network on your university
        </p>
      </div>

      {/* Google Signup Button */}
      <div className="space-y-4 mb-4">
        <Button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading || registerLoading}
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
          <span>Sign up with Google</span>
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-[11px] tracking-wider text-slate-400 font-semibold">
              or register with email
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pt-1" noValidate>
        {authError?.message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>Sign Up Notice</span>
            </div>
            <p className="pl-6 text-red-600 leading-relaxed">{authError.message}</p>
            {authError.message.toLowerCase().includes('popup') && (
              <p className="pl-6 text-[11px] text-slate-500 pt-1 font-medium">
                💡 <strong>Tip:</strong> Click the popup-block icon in your browser's address bar to allow popups, or open this page in a new tab.
              </p>
            )}
          </motion.div>
        )}
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="full_name" className="text-xs font-semibold">
            Full Name
          </Label>
          <div className="relative group">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
            <Input
              id="full_name"
              placeholder="e.g. Chisom Adeleke"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              disabled={registerLoading || googleLoading}
              className={`h-11 pl-10 focus-visible:ring-amber-500 ${
                fieldErrors.full_name ? 'border-red-500' : ''
              }`}
            />
          </div>
          {fieldErrors.full_name && (
            <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {fieldErrors.full_name}
            </p>
          )}
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold">
            Email Address
          </Label>
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
            <Input
              id="email"
              type="email"
              placeholder="blessing@student.unilag.edu.ng"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={registerLoading || googleLoading}
              className={`h-11 pl-10 focus-visible:ring-amber-500 ${
                fieldErrors.email ? 'border-red-500' : ''
              }`}
            />
          </div>
          {fieldErrors.email && (
            <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-semibold">
            Phone Number (Nigeria)
          </Label>
          <div className="relative group">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
            <Input
              id="phone"
              type="tel"
              placeholder="08012345678"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={registerLoading || googleLoading}
              className={`h-11 pl-10 focus-visible:ring-amber-500 ${
                fieldErrors.phone ? 'border-red-500' : ''
              }`}
            />
          </div>
          {fieldErrors.phone && (
            <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {fieldErrors.phone}
            </p>
          )}
        </div>

        {/* Campus Hub / Institution Selector */}
        <div className="space-y-1.5">
          <Label htmlFor="campus_hub" className="text-xs font-semibold flex items-center justify-between">
            <span>Campus Hub / University</span>
            <span className="text-[10px] text-amber-600 font-medium">Local zone for escrow & dispatch</span>
          </Label>
          <div className="relative group">
            <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-600 transition-colors pointer-events-none" />
            <select
              id="campus_hub"
              value={formData.campus_hub}
              onChange={(e) => handleInputChange('campus_hub', e.target.value)}
              disabled={registerLoading || googleLoading}
              className={`w-full h-11 pl-10 pr-8 bg-white border rounded-md text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none cursor-pointer ${
                fieldErrors.campus_hub ? 'border-red-500' : 'border-slate-300'
              }`}
            >
              <option value="">Select your university / campus hub...</option>
              {campusHubs.map((hub) => (
                <option key={hub} value={hub}>
                  {hub}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
              ▼
            </div>
          </div>
          {fieldErrors.campus_hub && (
            <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {fieldErrors.campus_hub}
            </p>
          )}
        </div>

        {/* Role Selector Cards */}
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-slate-700">Account Type:</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleInputChange('role', 'customer')}
              disabled={registerLoading || googleLoading}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                formData.role === 'customer'
                  ? 'border-amber-500 bg-amber-50/80 text-slate-900 shadow-sm'
                  : 'border-slate-200 hover:border-amber-200 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className={`h-4 w-4 ${formData.role === 'customer' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold">Customer</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">Hire artisans or dispatch</span>
            </button>

            <button
              type="button"
              onClick={() => handleInputChange('role', 'provider')}
              disabled={registerLoading || googleLoading}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                formData.role === 'provider'
                  ? 'border-amber-500 bg-amber-50/80 text-slate-900 shadow-sm'
                  : 'border-slate-200 hover:border-amber-200 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase className={`h-4 w-4 ${formData.role === 'provider' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold">Provider / Rider</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">Earn on campus jobs</span>
            </button>
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-semibold">
            Password
          </Label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters (A-Z, 0-9)"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={registerLoading || googleLoading}
              className={`h-11 pl-10 pr-12 focus-visible:ring-amber-500 ${
                fieldErrors.password ? 'border-red-500' : ''
              }`}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {formData.password && (
            <div className="space-y-1 pt-0.5">
              <div className="flex gap-1 h-1 w-full rounded-full overflow-hidden bg-slate-100">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 transition-all ${
                      passwordStrength.score >= step
                        ? passwordStrength.score <= 1
                          ? 'bg-red-500'
                          : passwordStrength.score === 2
                          ? 'bg-orange-500'
                          : passwordStrength.score === 3
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className={`text-[10px] font-semibold ${passwordStrength.color}`}>
                {passwordStrength.label}
              </span>
            </div>
          )}

          {fieldErrors.password && (
            <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password" className="text-xs font-semibold">
            Confirm Password
          </Label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
            <Input
              id="confirm_password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter your password"
              value={formData.confirm_password}
              onChange={(e) => handleInputChange('confirm_password', e.target.value)}
              disabled={registerLoading || googleLoading}
              className={`h-11 pl-10 pr-12 focus-visible:ring-amber-500 ${
                fieldErrors.confirm_password ? 'border-red-500' : ''
              }`}
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {fieldErrors.confirm_password && (
            <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {fieldErrors.confirm_password}
            </p>
          )}

          {!fieldErrors.confirm_password &&
            formData.confirm_password &&
            formData.password === formData.confirm_password &&
            formData.password.length > 0 && (
              <div className="flex items-center gap-1 text-emerald-600 text-[11px] font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Passwords match ✓</span>
              </div>
            )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all text-sm"
            disabled={registerLoading || googleLoading}
          >
            {registerLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Firebase account...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-slate-500 pt-2">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => setView('login')}
            className="text-amber-600 font-semibold hover:underline transition-colors"
          >
            Sign in
          </button>
        </p>
      </form>
    </div>
  );
}
