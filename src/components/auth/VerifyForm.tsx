import { useState, useEffect, useRef, useCallback } from 'react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, Mail, Shield, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { useAppStore } from '@/store/app-store';

export function VerifyForm() {
  const { setView } = useAppStore();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(60);
    setCanResend(false);

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    const storedEmail = localStorage.getItem('verification_email');
    if (storedEmail) setEmail(storedEmail);

    startTimer();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const verifyCode = useCallback(async (verificationEmail: string, verificationCode: string) => {
    setError(null);
    setLoading(true);

    try {
      const response = await authApi.verify({ email: verificationEmail, code: verificationCode });
      if (response.data.success || response.data.message) {
        setIsSuccess(true);
        toast.success('Account verified successfully! 🎉');
        setTimeout(() => {
          setView('login');
        }, 1500);
      } else {
        setError(response.data.message || 'Invalid verification code. Please check and try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [setView]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code) {
      setError('Please enter your email and the 6-digit verification code');
      return;
    }
    verifyCode(email, code);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(cleanValue);
    if (error) setError(null);

    if (cleanValue.length === 6 && email && !loading) {
      verifyCode(email, cleanValue);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please provide a valid email address to resend the code.');
      return;
    }

    setResending(true);
    setError(null);

    try {
      await authApi.resendVerification({ email });
      toast.success('Verification code resent! Check your email.');
      startTimer();
    } catch (err) {
      toast.error('Failed to resend verification code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8 space-y-4"
      >
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="rounded-full bg-emerald-100 p-4"
          >
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </motion.div>
        </div>
        <h3 className="text-2xl font-bold tracking-tight">Account Verified! 🎉</h3>
        <p className="text-sm text-muted-foreground">
          Your account has been successfully verified.
          <br />
          Redirecting you to login page...
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Email Input */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-semibold">
          Email Address
        </Label>
        <div className="relative group">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
          <Input
            id="email"
            type="email"
            placeholder="Enter the email you used to sign up"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="h-12 pl-10 focus-visible:ring-orange-500"
          />
        </div>
      </div>

      {/* Verification Code Input */}
      <div className="space-y-2">
        <Label htmlFor="code" className="text-sm font-semibold">
          Verification Code
        </Label>
        <div className="relative group">
          <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="• • • • • •"
            maxLength={6}
            value={code}
            onChange={handleCodeChange}
            required
            disabled={loading}
            className="h-12 pl-10 text-center text-2xl tracking-[0.5em] font-mono font-bold focus-visible:ring-orange-500"
          />
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-orange-500" />
          Enter the 6-digit security code sent to your inbox
        </p>
      </div>

      {/* Verify Button */}
      <Button
        type="submit"
        className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all text-base"
        disabled={loading || code.length < 6}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            <Shield className="mr-2 h-4 w-4" />
            Verify Account
          </>
        )}
      </Button>

      {/* Resend Action */}
      <div className="text-center pt-2">
        <p className="text-sm text-muted-foreground">
          Didn't receive a code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || resending}
            className="text-orange-600 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            {resending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Resending...
              </>
            ) : canResend ? (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Resend code
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Resend in {timer}s
              </>
            )}
          </button>
        </p>
      </div>
    </form>
  );
}
