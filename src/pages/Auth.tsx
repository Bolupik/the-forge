import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ParticleField from '@/components/ParticleField';
import RecoveryPhraseBackup from '@/components/wallet/RecoveryPhraseBackup';
import { useStacksAuth } from '@/contexts/StacksAuthContext';
import { describePasskeyError, platformAuthenticatorAvailable } from '@/lib/passkeyAuth';

const Auth = () => {
  const { isAuthenticated, isLoading, signIn, signInPasskey, signUpPasskey } = useStacksAuth();
  const navigate = useNavigate();
  const [pendingPhrase, setPendingPhrase] = useState<string | null>(null);
  const [busy, setBusy] = useState<'up' | 'in' | null>(null);
  const [platformPasskey, setPlatformPasskey] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/gallery', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    platformAuthenticatorAvailable().then(setPlatformPasskey);
  }, []);

  const handlePasskey = async (mode: 'up' | 'in') => {
    setBusy(mode);
    try {
      if (mode === 'up') {
        const phrase = await signUpPasskey();
        setPendingPhrase(phrase);
      } else {
        await signInPasskey();
      }
    } catch (e) {
      toast.error(describePasskeyError(e));
    } finally {
      setBusy(null);
    }
  };

  // Just signed up with a passkey: force the one-time phrase backup before
  // letting the user anywhere near their new wallet.
  if (pendingPhrase) {
    return (
      <div className="min-h-screen relative">
        <ParticleField />
        <div className="fixed inset-0 flex items-center justify-center z-10 px-4 overflow-y-auto py-10">
          <RecoveryPhraseBackup phrase={pendingPhrase} onDone={() => navigate('/gallery')} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <ParticleField />
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-8 z-10 px-4">
        {/* Spinning Emblem */}
        <div className="relative w-[88px] h-[88px]">
          <div
            className="absolute inset-0 rounded-full animate-spin-slow"
            style={{
              border: '1px solid rgba(224,72,58,0.5)',
              background: 'conic-gradient(transparent 80%, rgba(224,72,58,0.6) 100%)',
            }}
          />
          <div
            className="absolute rounded-full animate-spin-reverse"
            style={{ inset: '10px', border: '1px solid rgba(224,72,58,0.2)' }}
          />
          <span
            className="absolute inset-0 flex items-center justify-center text-3xl"
            style={{ filter: 'drop-shadow(0 0 14px rgba(224,72,58,0.8))' }}
          >
            ⚡
          </span>
        </div>

        <h1
          className="font-display text-5xl md:text-6xl font-black tracking-wide text-gold-gradient text-center"
          style={{ filter: 'drop-shadow(0 0 40px rgba(224,72,58,0.35))' }}
        >
          CardForge
        </h1>

        <p
          className="font-body text-[0.72rem] uppercase tracking-[0.4em] text-center"
          style={{ color: 'var(--cf-muted2)' }}
        >
          Genesis Collection · Bitcoin NFTs
        </p>

        {/* Auth Card */}
        <div
          className="relative w-full max-w-[420px] p-8 md:p-10 rounded-[20px] overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(20,20,40,0.9), rgba(13,13,26,0.95))',
            border: '1px solid var(--cf-border2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <div
            className="absolute inset-0 animate-spin-slow opacity-[0.03] pointer-events-none"
            style={{
              background:
                'conic-gradient(from 0deg, transparent, rgba(224,72,58,0.5), transparent, rgba(120,60,200,0.3), transparent)',
            }}
          />

          <div className="relative flex items-center gap-4 mb-8">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--cf-border2))' }} />
            <span
              className="font-ui text-xs font-semibold uppercase tracking-[0.25em]"
              style={{ color: 'var(--cf-muted2)' }}
            >
              Connect Wallet
            </span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, var(--cf-border2), transparent)' }} />
          </div>

          <p
            className="relative text-center text-sm mb-8 leading-relaxed"
            style={{ color: 'var(--cf-muted2)' }}
          >
            Sign in with a passkey (Face ID, Touch ID, Windows Hello or PIN) and get a built-in Stacks
            wallet — or connect an external Xverse / Leather wallet.
          </p>

          {/* Passkey-first */}
          {platformPasskey && (
            <div className="relative flex flex-col gap-3 mb-6">
              <button
                type="button"
                onClick={() => handlePasskey('up')}
                disabled={busy !== null}
                className="w-full py-4 font-display text-sm font-bold tracking-wider rounded-lg transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #a02d22, #e0483a)',
                  color: 'var(--cf-bg)',
                  boxShadow: '0 4px 20px rgba(224,72,58,0.3)',
                }}
              >
                {busy === 'up' ? 'Creating…' : '✦ Create account with passkey'}
              </button>
              <button
                type="button"
                onClick={() => handlePasskey('in')}
                disabled={busy !== null}
                className="w-full py-4 font-display text-sm font-bold tracking-wider rounded-lg transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  border: '1px solid var(--cf-border2)',
                  color: 'var(--cf-gold)',
                  background: 'rgba(224,72,58,0.06)',
                }}
              >
                {busy === 'in' ? 'Verifying…' : '👆 Sign in with passkey'}
              </button>
              <p className="text-center text-[0.62rem]" style={{ color: 'var(--cf-muted)' }}>
                A Stacks wallet is created automatically and stays on this device, unlocked by your passkey.
              </p>
              <div className="flex items-center gap-4 my-1">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--cf-border2))' }} />
                <span className="font-ui text-[0.6rem] uppercase tracking-[0.25em]" style={{ color: 'var(--cf-muted)' }}>or</span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, var(--cf-border2), transparent)' }} />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={signIn}
            disabled={isLoading || busy !== null}
            className="relative w-full py-4 font-display text-sm font-bold tracking-wider rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: platformPasskey
                ? 'transparent'
                : 'linear-gradient(135deg, #a02d22, #ff8a7a, #e0483a, #ffb1a6, #e0483a)',
              backgroundSize: '300% 100%',
              border: platformPasskey ? '1px solid var(--cf-border2)' : 'none',
              color: platformPasskey ? 'var(--cf-fg)' : 'var(--cf-bg)',
              boxShadow: platformPasskey ? 'none' : '0 4px 20px rgba(224,72,58,0.3)',
            }}
          >
            <span className="relative z-10">🔗 Connect Stacks Wallet</span>
          </button>

          <div className="relative mt-6 flex items-center justify-center gap-3 text-[0.7rem]" style={{ color: 'var(--cf-muted)' }}>
            <span>Supports</span>
            <span className="font-semibold" style={{ color: 'var(--cf-gold)' }}>Xverse</span>
            <span>·</span>
            <span className="font-semibold" style={{ color: 'var(--cf-gold)' }}>Leather</span>
          </div>

          <p className="relative text-center mt-6 text-[0.62rem]" style={{ color: 'var(--cf-muted)' }}>
            By connecting, an anonymous account is created and linked to your wallet.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="font-ui text-xs uppercase tracking-[0.2em] transition-colors duration-300"
          style={{ color: 'var(--cf-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cf-gold)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--cf-muted)')}
        >
          ← Back to home
        </button>
      </div>
    </div>
  );
};

export default Auth;
