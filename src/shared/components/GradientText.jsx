export default function GradientText({ children, gold = false, className = '', ...props }) {
  return (
    <span className={`${gold ? 'gradient-text-gold' : 'gradient-text'} ${className}`} {...props}>
      {children}
    </span>
  );
}