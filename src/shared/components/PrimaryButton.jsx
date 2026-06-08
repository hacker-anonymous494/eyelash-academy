import { motion } from 'framer-motion';

export default function PrimaryButton({ children, loading, ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className="btn-primary w-full justify-center"
      disabled={loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </motion.button>
  );
}