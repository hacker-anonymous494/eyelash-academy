import { motion } from 'framer-motion';

export default function Button({ children, loading, ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 text-white font-semibold shadow-lg shadow-pink-200 disabled:opacity-60"
      disabled={loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </motion.button>
  );
}