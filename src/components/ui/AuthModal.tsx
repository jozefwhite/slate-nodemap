'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AuthModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const signupCode = process.env.NEXT_PUBLIC_SIGNUP_CODE;

  // Listen for auth state change (user clicks magic link in another tab)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string) => {
        if (event === 'SIGNED_IN') {
          onSuccess();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [supabase, onSuccess]);

  const handleSubmit = async () => {
    setError('');

    if (!email.trim()) {
      setError('enter your email');
      return;
    }

    // Validate access code
    if (signupCode && accessCode.trim().toLowerCase() !== signupCode.toLowerCase()) {
      setError('invalid access code');
      return;
    }

    setSending(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/explore`,
        },
      });

      if (authError) {
        setError(authError.message);
      } else {
        setLinkSent(true);
      }
    } catch {
      setError('something went wrong');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white border border-surface-2 w-full max-w-sm mx-4 p-6 shadow-lg animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-3 hover:text-ink-0 transition-colors p-1"
        >
          <X size={16} />
        </button>

        <h2 className="text-sm font-medium text-ink-0 mb-1">save your map</h2>
        <p className="text-xs text-ink-3 mb-5">
          sign in to save, load, and connect your exploration maps.
        </p>

        {linkSent ? (
          <div className="p-4 bg-surface-1 border border-surface-2">
            <p className="text-xs text-ink-2">
              check your email for a sign-in link. you can close this and come back.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your email"
                className="w-full bg-surface-1 border border-surface-2 text-sm text-ink-1 px-4 py-3 placeholder:text-ink-3 focus:outline-none focus:border-ink-3 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            {signupCode && (
              <div>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="access code"
                  className="w-full bg-surface-1 border border-surface-2 text-sm text-ink-1 px-4 py-3 placeholder:text-ink-3 focus:outline-none focus:border-ink-3 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={sending || !email.trim()}
              className="w-full py-3 bg-ink-0 text-white text-sm hover:bg-ink-1 disabled:opacity-30 transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  sending...
                </>
              ) : (
                'sign in'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
