import React, { useState, useEffect } from 'react';
import { Mail, Lock, AlertCircle, Loader2, Compass, Eye, EyeOff, Check, X, User, Calendar, MapPin, AtSign, CheckCircle2 } from 'lucide-react';
import { getSupabaseClient, updateUserProfileData } from '../services/supabaseClient';
import { validateUsernameFormat, checkUsernameAvailability, claimUsername, cleanUsernameInput } from '../services/usernameService';
import { ThemeConfig } from '../types';

export type AuthMode = 'signin' | 'signup' | 'forgot_password' | 'update_password';

interface AuthPageProps {
  currentTheme: ThemeConfig;
  initialAuthMode?: AuthMode;
  onAuthSuccess: () => void;
  onCancel: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ currentTheme, initialAuthMode = 'signin', onAuthSuccess, onCancel }) => {
  const [authMode, setAuthMode] = useState<AuthMode>(initialAuthMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameFeedback, setUsernameFeedback] = useState<string | null>(null);
  const [dob, setDob] = useState('');
  const [place, setPlace] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // Track if we need to show the resend confirmation button
  const [showResend, setShowResend] = useState(false);

  // Validation states
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password !== '';

  // Debounced check for username availability in real-time as user types
  useEffect(() => {
    if (authMode !== 'signup') {
      setUsernameStatus('idle');
      setUsernameFeedback(null);
      return;
    }

    const clean = cleanUsernameInput(username);
    if (!clean) {
      setUsernameStatus('idle');
      setUsernameFeedback(null);
      return;
    }

    const validation = validateUsernameFormat(clean);
    if (!validation.isValid) {
      setUsernameStatus('invalid');
      setUsernameFeedback(validation.error || 'Invalid username');
      return;
    }

    setUsernameStatus('checking');
    setUsernameFeedback(null);

    const timer = setTimeout(async () => {
      const res = await checkUsernameAvailability(clean);
      if (res.available) {
        setUsernameStatus('available');
        setUsernameFeedback('Username is available');
      } else {
        setUsernameStatus('taken');
        setUsernameFeedback(res.error || `@${clean} is already taken.`);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, authMode]);

  const getErrorMessage = (err: any): string => {
    const msg = err?.message?.toLowerCase() || '';
    if (msg.includes('invalid login credentials')) {
      return 'Incorrect email or password. Please try again.';
    }
    if (msg.includes('weak_password') || msg.includes('weak password')) {
      return 'Password is too weak. Please meet all requirements.';
    }
    if (msg.includes('already registered')) {
      return 'Account already exists. Try signing in.';
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    return err?.message || 'Something went wrong. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setShowResend(false);

    if (authMode === 'signup') {
      const cleanUname = cleanUsernameInput(username);
      const validation = validateUsernameFormat(cleanUname);
      if (!validation.isValid) {
        setError(validation.error || 'Please choose a valid username.');
        return;
      }

      // Check unique availability
      setLoading(true);
      const availCheck = await checkUsernameAvailability(cleanUname);
      if (!availCheck.available) {
        setError(availCheck.error || `@${cleanUname} is already registered. Please choose another username.`);
        setUsernameStatus('taken');
        setUsernameFeedback(availCheck.error || `@${cleanUname} is already registered.`);
        setLoading(false);
        return;
      }

      if (!hasMinLength || !hasUppercase || !hasNumber) {
        setError('Please ensure your password meets all requirements.');
        setLoading(false);
        return;
      }
      if (!passwordsMatch) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
    }

    if (authMode === 'update_password') {
      if (!hasMinLength || !hasUppercase || !hasNumber) {
        setError('Please ensure your password meets all requirements.');
        return;
      }
      if (!passwordsMatch) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Database connection not configured.');
      setLoading(false);
      return;
    }

    try {
      if (authMode === 'signup') {
        const cleanUname = cleanUsernameInput(username);
        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: `@${cleanUname}`,
              full_name: fullName.trim(),
              name: fullName.trim(),
              dob: dob.trim(),
              place: place.trim()
            }
          }
        });

        if (signUpError) {
          setError(getErrorMessage(signUpError));
        } else {
          if (data.user && data.user.identities && data.user.identities.length === 0) {
            setError('Account already exists. Try signing in.');
          } else {
            // Reserve unique username in system
            await claimUsername(cleanUname, data.user?.id, email);

            if (data.user) {
              updateUserProfileData({
                name: fullName.trim() || cleanUname,
                username: `@${cleanUname}`,
                dob: dob.trim(),
                place: place.trim(),
                email
              });
            }
            setMessage('Success! Please check your email for a confirmation link.');
            setShowResend(true);
          }
        }
      } else if (authMode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(getErrorMessage(signInError));
        } else {
          onAuthSuccess();
        }
      } else if (authMode === 'forgot_password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        
        if (resetError) {
          setError(getErrorMessage(resetError));
        } else {
          setMessage('Password reset instructions sent. Please check your email.');
        }
      } else if (authMode === 'update_password') {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        
        if (updateError) {
          setError(getErrorMessage(updateError));
        } else {
          setMessage('Password updated successfully! You can now sign in.');
          setAuthMode('signin');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) {
        setError(getErrorMessage(error));
      } else {
        setMessage('Confirmation email resent. Please check your inbox.');
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) {
      if (authMode === 'signin') return 'Signing in...';
      if (authMode === 'signup') return 'Creating account...';
      if (authMode === 'forgot_password') return 'Sending reset link...';
      if (authMode === 'update_password') return 'Updating password...';
    }
    if (authMode === 'signin') return 'Sign In';
    if (authMode === 'signup') return 'Create Account';
    if (authMode === 'forgot_password') return 'Send Reset Link';
    if (authMode === 'update_password') return 'Set New Password';
    return '';
  };

  const renderValidationItem = (isValid: boolean, text: string) => (
    <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${isValid ? 'text-emerald-600' : 'text-slate-400'}`}>
      {isValid ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
      <span>{text}</span>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="relative bg-white/95 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div 
          className="h-2 w-full"
          style={{ background: currentTheme.heroGradient }}
        />
        
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-xl shrink-0 ring-2 ring-emerald-500/20">
                <img
                  src="/logo.png"
                  alt="TripWise Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-3xl font-extrabold tracking-tight font-sans text-slate-900">
                Trip<span style={{ color: currentTheme.primaryColor }}>Wise</span>
              </span>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
              {authMode === 'signup' && 'Create your TripWise account'}
              {authMode === 'signin' && 'Welcome Back'}
              {authMode === 'forgot_password' && 'Reset Password'}
              {authMode === 'update_password' && 'Set New Password'}
            </h2>
            <p className="text-slate-600 font-medium text-sm">
              {authMode === 'signup' && 'Join TripWise to save and adapt your itineraries.'}
              {authMode === 'signin' && 'Sign in to access your personalized trips.'}
              {authMode === 'forgot_password' && 'Enter your email to receive a reset link.'}
              {authMode === 'update_password' && 'Please enter a strong new password.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 rounded-xl bg-red-50/80 border border-red-100 flex items-start gap-3 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="font-medium">{error}</p>
              </div>
            )}
            
            {message && (
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-100 flex flex-col gap-3 text-emerald-700 text-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="font-medium">{message}</p>
                </div>
                {showResend && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="self-start px-3 py-1.5 rounded-lg text-sm font-bold bg-white/60 hover:bg-white border border-emerald-200 transition-colors ml-8"
                    style={{ color: currentTheme.primaryColor }}
                  >
                    Resend confirmation email
                  </button>
                )}
              </div>
            )}

            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all shadow-sm font-medium text-slate-800"
                      style={{ '--tw-ring-color': currentTheme.primaryColor } as any}
                      placeholder="e.g. Alex Rivera"
                      required
                    />
                  </div>
                </div>

                {/* Unique Username field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-slate-700">
                      Username <span className="text-red-500">*</span>
                    </label>
                    {usernameStatus === 'checking' && (
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Checking...
                      </span>
                    )}
                    {usernameStatus === 'available' && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Available
                      </span>
                    )}
                    {usernameStatus === 'taken' && (
                      <span className="text-xs text-red-600 flex items-center gap-1 font-semibold">
                        <X className="w-3.5 h-3.5" />
                        Already taken
                      </span>
                    )}
                    {usernameStatus === 'invalid' && username.trim().length > 0 && (
                      <span className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                        Invalid
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                      <AtSign className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      className={`w-full pl-10 pr-10 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all shadow-sm font-semibold text-slate-800 lowercase ${
                        usernameStatus === 'available' 
                          ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200' 
                          : usernameStatus === 'taken' || usernameStatus === 'invalid'
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-slate-200'
                      }`}
                      style={{ '--tw-ring-color': currentTheme.primaryColor } as any}
                      placeholder="traveler_99"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      required
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {usernameStatus === 'checking' && (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      )}
                      {usernameStatus === 'available' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                      {usernameStatus === 'taken' && (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  {usernameFeedback && (
                    <p className={`text-xs mt-1.5 ml-1 font-medium ${
                      usernameStatus === 'available' 
                        ? 'text-emerald-600' 
                        : usernameStatus === 'taken' 
                          ? 'text-red-600' 
                          : 'text-amber-600'
                    }`}>
                      {usernameFeedback}
                    </p>
                  )}
                  {!usernameFeedback && (
                    <p className="text-[11px] text-slate-400 mt-1.5 ml-1">
                      Must be unique. 3–20 lowercase letters, numbers, or underscores.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={dob}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full pl-10 pr-2 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all shadow-sm text-xs sm:text-sm font-medium text-slate-800 cursor-pointer"
                        style={{ '--tw-ring-color': currentTheme.primaryColor } as any}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Place / City
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={place}
                        onChange={(e) => setPlace(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all shadow-sm font-medium text-slate-800 text-xs sm:text-sm"
                        style={{ '--tw-ring-color': currentTheme.primaryColor } as any}
                        placeholder="e.g. Bengaluru"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {(authMode === 'signin' || authMode === 'signup' || authMode === 'forgot_password') && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all shadow-sm"
                    style={{ '--tw-ring-color': currentTheme.primaryColor } as any}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
            )}

            {authMode !== 'forgot_password' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-700">
                    {authMode === 'update_password' ? 'New Password' : 'Password'}
                  </label>
                  {authMode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot_password');
                        setError(null);
                        setMessage(null);
                      }}
                      className="text-xs font-bold hover:underline"
                      style={{ color: currentTheme.primaryColor }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all shadow-sm"
                    style={{ '--tw-ring-color': currentTheme.primaryColor } as any}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {(authMode === 'signup' || authMode === 'update_password') && (
              <>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-500 mb-1">Password Requirements:</p>
                  {renderValidationItem(hasMinLength, 'At least 8 characters')}
                  {renderValidationItem(hasUppercase, 'At least 1 uppercase letter')}
                  {renderValidationItem(hasNumber, 'At least 1 number')}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-11 pr-11 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-all shadow-sm ${confirmPassword && !passwordsMatch ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'}`}
                      style={{ '--tw-ring-color': confirmPassword && !passwordsMatch ? '' : currentTheme.primaryColor } as any}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-red-500 text-xs font-medium mt-1.5 ml-1">Passwords do not match</p>
                  )}
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                (authMode === 'signup' && (
                  !fullName.trim() ||
                  !username.trim() ||
                  usernameStatus !== 'available' ||
                  !hasMinLength ||
                  !hasUppercase ||
                  !hasNumber ||
                  !passwordsMatch
                )) ||
                (authMode === 'update_password' && (!hasMinLength || !hasUppercase || !hasNumber || !passwordsMatch))
              }
              className="w-full py-3.5 px-4 rounded-xl text-white font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2 mt-6"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {getButtonText()}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-600 font-medium">
            {authMode === 'signin' && (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setError(null);
                    setMessage(null);
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="font-bold hover:underline ml-1"
                  style={{ color: currentTheme.primaryColor }}
                >
                  Sign Up
                </button>
              </>
            )}
            {authMode === 'signup' && (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setError(null);
                    setMessage(null);
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="font-bold hover:underline ml-1"
                  style={{ color: currentTheme.primaryColor }}
                >
                  Sign In
                </button>
              </>
            )}
            {authMode === 'forgot_password' && (
              <>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setError(null);
                    setMessage(null);
                  }}
                  className="font-bold hover:underline ml-1"
                  style={{ color: currentTheme.primaryColor }}
                >
                  Back to Sign In
                </button>
              </>
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel and return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
