'use client';

/**
 * OTP signup/signin (email or phone) — proves the user is human by verifying
 * possession of the address/number before any account exists.
 *
 *  Gmail : account.createEmailToken()  -> 6-digit code by email (works on
 *          Appwrite Cloud out of the box, no SMTP setup needed).
 *  Phone : account.createPhoneToken()  -> 6-digit code by SMS (needs a
 *          Messaging provider enabled in the Appwrite Console, otherwise the
 *          API answers 400 "SMS not configured" and we say so plainly).
 *
 *  Verify: account.createSession(userId, code) -> real Appwrite session, then
 *  the caller runs finishAppwriteSession() (JWT + backend profile sync into
 *  the Appwrite DB `users` collection + local mirror).
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccount, ID } from '@/lib/appwrite-client';
import { finishAppwriteSession } from '@/lib/appwrite-auth';
import { LuxInput, LuxLabel, LuxSubmit } from '@/components/AuthLux';

type Channel = 'email' | 'phone';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/; // E.164

function explainSendError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  if (/sms|messaging|provider|400|invalid phone/i.test(msg))
    return 'SMS sending failed — enable a Messaging (SMS) provider in your Appwrite Console project, then retry. Email OTP works without any setup.';
  if (/rate|limit|429/i.test(msg)) return 'Too many codes requested — wait a minute and retry.';
  if (/already|exists|409/i.test(msg)) return 'This address is already registered — sign in instead.';
  return msg || 'Could not send the code — check the address and try again.';
}

function explainVerifyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  if (/invalid|mismatch|401|secret|token/i.test(msg)) return 'Wrong or expired code — check the latest message and try again.';
  return msg || 'Verification failed — try again.';
}

export function OtpAuth({
  displayName = '',
  signupHint = '',
  locked = false,
  lockedHint = '',
  channel = 'phone',
}: {
  /** Set after verify (signup) so the Appwrite profile carries the name. */
  displayName?: string;
  signupHint?: string;
  /** When true (e.g. terms not accepted), sending/verifying is blocked. */
  locked?: boolean;
  lockedHint?: string;
  channel?: Channel;
}) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [userId, setUserId] = useState('');
  const [step, setStep] = useState<'id' | 'code'>('id');
  const [codes, setCodes] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'code') boxRefs.current[0]?.focus();
  }, [step]);

  const validId =
    channel === 'email' ? EMAIL_RE.test(identifier.trim()) : PHONE_RE.test(identifier.trim());

  const send = async () => {
    setError('');
    if (locked) {
      setError(lockedHint || 'Please accept the terms first.');
      return;
    }
    const account = getAccount();
    if (!account) {
      setError('Appwrite is not configured — set NEXT_PUBLIC_APPWRITE_* in frontend/.env.local.');
      return;
    }
    if (!validId) {
      setError(channel === 'email' ? 'Enter a valid Gmail address.' : 'Enter phone in E.164 format, e.g. +14155552671.');
      return;
    }
    setBusy(true);
    try {
      const id = ID.unique();
      if (channel === 'email') {
        await account.createEmailToken(id, identifier.trim());
      } else {
        await account.createPhoneToken(id, identifier.trim());
      }
      setUserId(id);
      setCodes(['', '', '', '', '', '']);
      setStep('code');
      setCooldown(30);
    } catch (e) {
      setError(explainSendError(e));
    } finally {
      setBusy(false);
    }
  };

  const setCode = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1);
    setCodes((c) => {
      const n = [...c];
      n[i] = d;
      return n;
    });
    if (d && i < 5) boxRefs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codes[i] && i > 0) boxRefs.current[i - 1]?.focus();
    if (e.key === 'Enter') verify();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    if (!digits.length) return;
    e.preventDefault();
    setCodes((c) => c.map((_, i) => digits[i] || ''));
    boxRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  const verify = async () => {
    setError('');
    if (locked) {
      setError(lockedHint || 'Please accept the terms first.');
      return;
    }
    const secret = codes.join('');
    if (secret.length !== 6) {
      setError('Enter all 6 digits from the message we sent.');
      return;
    }
    const account = getAccount();
    if (!account || !userId) {
      setError('Session expired — request a new code.');
      setStep('id');
      return;
    }
    setBusy(true);
    try {
      await account.createSession(userId, secret);
      if (displayName.trim()) {
        try {
          await account.updateName(displayName.trim());
        } catch {
          /* name update is cosmetic — session already valid */
        }
      }
      const done = await finishAppwriteSession();
      if (!done.ok) {
        setError(done.error || 'Sign-in failed.');
        return;
      }
      router.push('/');
    } catch (e) {
      setError(explainVerifyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">


      {step === 'id' ? (
        <>
          <div className="flex flex-col gap-1.5">
            <LuxLabel htmlFor="otp-id">
              {channel === 'email' ? 'Gmail address' : 'Phone number'}
            </LuxLabel>
            <LuxInput
              id="otp-id"
              type={channel === 'email' ? 'email' : 'tel'}
              autoComplete={channel === 'email' ? 'email' : 'tel'}
              placeholder={channel === 'email' ? 'you@gmail.com' : '+14155552671'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
            />
            {signupHint && <p className="text-[11px] text-outline text-center mt-1">{signupHint}</p>}
          </div>
          {error && (
            <p className="text-sm text-error bg-error/10 border border-error/30 rounded-xl px-4 py-2.5">{error}</p>
          )}
          <LuxSubmit loading={busy} disabled={!validId}>
            <span>Send verification code</span>
            <span className="material-symbols-outlined text-base">sms</span>
          </LuxSubmit>
        </>
      ) : (
        <>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            6-digit code sent to <span className="text-on-surface font-medium">{identifier.trim()}</span>.{' '}
            <button type="button" onClick={() => setStep('id')} className="text-primary hover:underline">
              Change
            </button>
          </p>
          <div className="flex gap-2 justify-between" onPaste={onPaste}>
            {codes.map((c, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxRefs.current[i] = el;
                }}
                value={c}
                onChange={(e) => setCode(i, e.target.value)}
                onKeyDown={(e) => onKey(i, e)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                aria-label={`Digit ${i + 1}`}
                className="w-11 h-13 py-3 text-center text-xl font-mono rounded-xl bg-surface-container-highest/60 border border-white/10 text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
              />
            ))}
          </div>
          {error && (
            <p className="text-sm text-error bg-error/10 border border-error/30 rounded-xl px-4 py-2.5">{error}</p>
          )}
          <LuxSubmit loading={busy} disabled={codes.join('').length !== 6}>
            <span>Verify & enter workspace</span>
            <span className="material-symbols-outlined text-base">verified</span>
          </LuxSubmit>
          <button
            type="button"
            onClick={send}
            disabled={busy || cooldown > 0}
            className="text-sm text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </>
      )}
    </div>
  );
}
