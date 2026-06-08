import { motion } from 'framer-motion';

export default function GhostButton({ children, ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className="btn-ghost w-full justify-center"
      {...props}
    >
      {children}
    </motion.button>
  );
}