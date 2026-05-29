import ParticleField from '@/components/ParticleField';
import PublicNavBar from '@/components/PublicNavBar';
import DemoMintPage from '@/components/DemoMintPage';
import { useNavigate } from 'react-router-dom';
import { AppPage, getTrades } from '@/lib/cardforge';

/**
 * Public Demo Mint route — no Stacks wallet, no Supabase auth required.
 * Lists every template registered through the admin forge as mintable.
 */
const DemoMint = () => {
  const navigate = useNavigate();
  const trades = getTrades();

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
        <DemoMintPage />
      </div>
    </div>
  );
};

export default DemoMint;
