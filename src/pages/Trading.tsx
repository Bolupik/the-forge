import ParticleField from '@/components/ParticleField';
import PublicNavBar from '@/components/PublicNavBar';
import PublicTradingPage from '@/components/PublicTradingPage';
import PageTransition from '@/components/motion/PageTransition';
import { useNavigate } from 'react-router-dom';
import { AppPage, getCards, getTrades } from '@/lib/cardforge';

const Trading = () => {
  const navigate = useNavigate();
  const cards = getCards();
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
        <PublicNavBar activePage="trading" onNavigate={handleNavigate} tradeCount={trades.length} />
        <PageTransition>
          <PublicTradingPage cards={cards} trades={trades} />
        </PageTransition>
      </div>
    </div>
  );
};

export default Trading;
