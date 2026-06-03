import type { Variants, Transition } from 'framer-motion';

// Subtle, premium motion — intensity dialed to ~2/5.
export const ease = [0.22, 1, 0.36, 1] as const; // expo-out feel
export const easeSoft = [0.4, 0, 0.2, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease } },
};

export const stagger = (delay = 0.06, initial = 0.05): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren: initial } },
});

export const pageTransition: Transition = { duration: 0.4, ease };

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: pageTransition },
  exit: { opacity: 0, y: -6, transition: { duration: 0.25, ease: easeSoft } },
};

// Reusable hover/tap presets
export const hoverLift = {
  whileHover: { y: -2, transition: { duration: 0.25, ease } },
  whileTap: { scale: 0.97 },
};
