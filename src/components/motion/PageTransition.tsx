import { motion, useReducedMotion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';
import { ReactNode } from 'react';

const PageTransition = ({ children }: { children: ReactNode }) => {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ minHeight: '100%' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
