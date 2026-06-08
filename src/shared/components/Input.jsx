import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, ...props }, ref) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      ref={ref}
      className={`w-full px-4 py-3 rounded-xl border bg-white/80 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 ${
        error ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-pink-200'
      }`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
  </div>
));

Input.displayName = 'Input';
export default Input;