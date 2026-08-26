import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ParticleField from '@/components/ParticleField';
import PublicNavBar from '@/components/PublicNavBar';
import WalletPanel from '@/components/wallet/WalletPanel';
import PageTransition from '@/components/motion/PageTransition';
import { useStacksAuth } from '@/contexts/StacksAuthContext';
import { AppPage, getTrades } from '@/lib/cardforge';

/**
 * Embedded-wallet dashboard. Only meaningful for passkey wallets; external
 * wallet users are sent to their extension instead.
 */
const Wallet = () => {
  const navigate = useNavigate();
  const { walletKind } = useStacksAuth();
  const trades = getTrades();

  useEffect(() => {
    if (walletKind === 'connect') navigate('/account', { replace: true });
  }, [walletKind, navigate]);

  const handleNavigate = (page: AppPage) => {
    if (page === 'gallery') navigate('/gallery');
    else if (page === 'mint') navigate('/mint');
    else if (page === 'trading') navigate('/trading');
  };

  return (
    <div className="min-h-screen">
      <ParticleField />
      <div className="relative z-10">
        <PublicNavBar activePage="mint" onNavigate={handleNavigate} tradeCount={trades.length} />
        <PageTransition>
          <div className="pt-24 pb-16 px-4">
            <WalletPanel />
          </div>
        </PageTransition>
      </div>
    </div>
  );
};

export default Wallet;
