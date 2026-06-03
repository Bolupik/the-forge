import { AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

const AnimatedRoutes = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <div key={location.pathname} style={{ minHeight: '100vh' }}>
        {children}
      </div>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
