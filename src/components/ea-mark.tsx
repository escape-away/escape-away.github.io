/** The client's EA monogram, tinted by the current text colour. Drawn from their own PNG, never redrawn. */
export function EaMark({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`ea-mark ${className}`} />;
}
