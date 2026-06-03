import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { ButtonHTMLAttributes, forwardRef, useRef } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  strength?: number;
};

/** Tasteful magnetic hover — pulls the button slightly toward the cursor. */
const MagneticButton = forwardRef<HTMLButtonElement, Props>(
  ({ children, strength = 14, onMouseMove, onMouseLeave, style, ...rest }, ref) => {
    const reduce = useReducedMotion();
    const innerRef = useRef<HTMLButtonElement | null>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
    const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

    return (
      <motion.button
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as any).current = node;
        }}
        style={{ x: reduce ? 0 : sx, y: reduce ? 0 : sy, ...style }}
        whileTap={{ scale: 0.96 }}
        onMouseMove={(e) => {
          if (!reduce && innerRef.current) {
            const r = innerRef.current.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            x.set(px * strength);
            y.set(py * strength);
          }
          onMouseMove?.(e);
        }}
        onMouseLeave={(e) => {
          x.set(0);
          y.set(0);
          onMouseLeave?.(e);
        }}
        {...(rest as any)}
      >
        {children}
      </motion.button>
    );
  }
);
MagneticButton.displayName = 'MagneticButton';
export default MagneticButton;
