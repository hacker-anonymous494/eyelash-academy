import { forwardRef } from 'react';
import { motion } from 'framer-motion';

const GlassCard = forwardRef(({ className = '', children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={`glass rounded-2xl p-6 shadow-xl shadow-brand-rose-600/10 ${className}`}
    {...props}
  >
    {children}
  </motion.div>
));

export default GlassCard;