import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import PasswordStrength from '../components/Auth/PasswordStrength';

const EMAIL_STEP = 1;
const CODE_STEP = 2;
const PASSWORD_STEP = 3;

const RESEND_SECONDS = 60;

const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState(EMAIL_STEP);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isPasswordActive, setIsPasswordActive] = useState(false);

  // Detect if user landed from recovery link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.includes('type=recovery')) {
        setRecoveryMode(true);
        setStep(PASSWORD_STEP);
      }
    }
  }, []);

  // Wait for Supabase session if in recovery mode
  useEffect(() => {
    if (!recoveryMode) return;
    let unsub: any;
    setSessionReady(false);
    setSessionError(null);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setSessionReady(false);
      }
    });
    unsub = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSessionReady(true);
        setSessionError(null);
      }
    });
    // Remove the timeout and error display on initial load
    return () => {
      if (unsub && unsub.data && unsub.data.subscription) unsub.data.subscription.unsubscribe();
    };
  }, [recoveryMode]);

  // Start resend timer
  const startTimer = () => {
    setTimer(RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 1: Send reset code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/forgot-password',
      });
      if (error) throw error;
      toast.success('Check your email and follow the link to change your password.');
      setEmail('');
      // Optionally, redirect to login or keep user on the page
      // navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code (handled by Supabase magic link, but for UX, we simulate code input)
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 6) {
      toast.error('Please enter the 6-digit code from your email');
      return;
    }
    // In Supabase, the user clicks the link in their email, but for UX, we simulate code entry
    // Proceed to password step
    setStep(PASSWORD_STEP);
  };

  // Step 3: Set new password
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionReady) {
      setSessionError('Auth session missing! Please try the link again or request a new password reset.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      // Supabase expects the user to be on the magic link session
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Also update the perdoruesit table with the new password hash
      const session = (await supabase.auth.getSession()).data.session;
      const userEmail = session?.user?.email;
      if (!userEmail) throw new Error('Could not determine user email for DB update');
      const hashed = await bcrypt.hash(newPassword, 10);
      const { error: dbError } = await supabase
        .from('perdoruesit')
        .update({ password_hash: hashed })
        .eq('email', userEmail);
      if (dbError) throw dbError;

      toast.success('Password updated! You can now log in.');
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    if (timer > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/forgot-password',
      });
      if (error) throw error;
      toast.success('Verification code resent!');
      startTimer();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot Password
          </h2>
        </div>
        {recoveryMode ? (
          <>
            {!sessionReady && !sessionError && (
              <div className="text-center text-gray-500 font-medium mb-2">Checking session...</div>
            )}
            {sessionReady && !sessionError && (
              <>
                <div className="text-center text-yellow-700 font-medium mb-2 bg-yellow-100 border border-yellow-300 rounded p-2">
                  You are temporarily signed in to change your password. For security, you will be logged out after resetting your password.
                </div>
                <div className="text-center text-green-700 font-medium mb-2">Please enter your new password</div>
                <form className="mt-8 space-y-6" onSubmit={handleSetPassword}>
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                      New password
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        name="new-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm pr-14"
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onFocus={() => setIsPasswordActive(true)}
                        onBlur={() => setIsPasswordActive(false)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center focus:outline-none z-10 hover:bg-gray-100 rounded"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        style={{ pointerEvents: 'auto' }}
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.249-2.383A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.973 9.973 0 01-4.21 5.442M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <PasswordStrength password={newPassword} isActive={isPasswordActive} />
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                      Confirm new password
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-password"
                        name="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm pr-14"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center focus:outline-none z-10 hover:bg-gray-100 rounded"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        style={{ pointerEvents: 'auto' }}
                      >
                        {showConfirmPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.249-2.383A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.973 9.973 0 01-4.21 5.442M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Set new password'}
                  </button>
                </form>
              </>
            )}
            {sessionError && (
              <div className="text-center text-red-600 font-medium mb-2">{sessionError}</div>
            )}
          </>
        ) : (
          <>
            {step === EMAIL_STEP && (
              <form className="mt-8 space-y-6" onSubmit={handleSendCode}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Enter your email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send password reset email'}
                </button>
                <div className="text-sm text-center mt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-green-600 hover:text-green-500"
                  >
                    Back to login
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword; 