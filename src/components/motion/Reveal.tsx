import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { fadeUp } from '@/lib/motion';
import { ReactNode } from 'react';

interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'children' | 'variants'> {
  children: ReactNode;
  delay?: number;
  once?: boolean;
  amount?: number;
}

/** Subtle in-view fade-up. Respects prefers-reduced-motion. */
const Reveal = ({ children, delay = 0, once = true, amount = 0.2, ...rest }: RevealProps) => {
  const reduce = useReducedMotion();
  if (reduce) return <div {...(rest as any)}>{children}</div>;
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      transition={{ delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

export default Reveal;
