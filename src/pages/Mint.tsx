import ParticleField from '@/components/ParticleField';
import PublicNavBar from '@/components/PublicNavBar';
import MintPage from '@/components/MintPage';
import PageTransition from '@/components/motion/PageTransition';
import { useNavigate } from 'react-router-dom';
import { AppPage, getTrades } from '@/lib/cardforge';

const Mint = () => {
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
        <PageTransition>
          <MintPage />
        </PageTransition>
      </div>
    </div>
  );
};

export default Mint;
