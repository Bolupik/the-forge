import { useState } from 'react';

// Change this before deploy
const ADMIN_PASSWORD = 'bolupik';

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [password, setPassword] = useState('');
  const [shaking, setShaking] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('cf_sess', 'true');
      onLogin();
    } else {
      setError(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-[30px] z-10">
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
          style={{
            inset: '10px',
            border: '1px solid rgba(224,72,58,0.2)',
          }}
        />
        <span
          className="absolute inset-0 flex items-center justify-center text-3xl"
          style={{ filter: 'drop-shadow(0 0 14px rgba(224,72,58,0.8))' }}
        >
          ⚡
        </span>
      </div>

      {/* Logo */}
      <h1
        className="font-display text-5xl md:text-6xl font-black tracking-wide text-gold-gradient"
        style={{ filter: 'drop-shadow(0 0 40px rgba(224,72,58,0.35))' }}
      >
        CardForge
      </h1>

      {/* Tagline */}
      <p
        className="font-body text-[0.72rem] uppercase tracking-[0.4em]"
        style={{ color: 'var(--cf-muted2)' }}
      >
        Genesis Collection · Bitcoin NFTs
      </p>

      {/* Login Box */}
      <form
        onSubmit={handleSubmit}
        className={`relative w-full max-w-[400px] mx-4 p-[38px] rounded-[20px] overflow-hidden ${shaking ? 'animate-shake' : ''}`}
        style={{
          background: 'linear-gradient(145deg, rgba(20,20,40,0.9), rgba(13,13,26,0.95))',
          border: '1px solid var(--cf-border2)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Rotating conic gradient decoration */}
        <div
          className="absolute inset-0 animate-spin-slow opacity-[0.03] pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, transparent, rgba(224,72,58,0.5), transparent, rgba(120,60,200,0.3), transparent)',
          }}
        />

        {/* Title with flanking lines */}
        <div className="relative flex items-center gap-4 mb-8">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--cf-border2))' }} />
          <span className="font-ui text-sm font-semibold uppercase tracking-[0.25em]" style={{ color: 'var(--cf-muted2)' }}>
            Admin Access
          </span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, var(--cf-border2), transparent)' }} />
        </div>

        {/* Password Input */}
        <div className="relative mb-6">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="Enter password"
            className="w-full bg-transparent text-center font-body text-sm tracking-[0.2em] py-3 px-4 rounded-lg outline-none transition-all duration-300"
            style={{
              border: `1px solid ${error ? 'rgba(255,80,80,0.5)' : 'var(--cf-border2)'}`,
              color: 'var(--cf-text)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = error ? 'rgba(255,80,80,0.5)' : 'var(--cf-gold)';
              e.target.style.boxShadow = error
                ? '0 0 20px rgba(255,80,80,0.15)'
                : '0 0 20px rgba(224,72,58,0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error ? 'rgba(255,80,80,0.5)' : 'var(--cf-border2)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="relative w-full py-3 font-display text-sm font-bold tracking-wider rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #a02d22, #ff8a7a, #e0483a, #ffb1a6, #e0483a)',
            backgroundSize: '300% 100%',
            color: 'var(--cf-bg)',
            boxShadow: '0 4px 20px rgba(224,72,58,0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundPosition = '100% 0';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(224,72,58,0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundPosition = '0% 0';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(224,72,58,0.3)';
          }}
        >
          <span className="relative z-10">Enter the Forge</span>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              width: '50%',
              animation: 'sweep 3s ease-in-out infinite',
            }}
          />
        </button>

        {/* Hint */}
        <p className="text-center mt-5 text-[0.62rem]" style={{ color: 'var(--cf-muted)' }}>
          Authorized forge masters only
        </p>
      </form>
    </div>
  );
};

export default LoginScreen;
