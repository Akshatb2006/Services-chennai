type Props = {
  children: React.ReactNode;
  className?: string;
  /** Stagger offset in seconds-equivalent; shifts where in the scroll the reveal starts. */
  delay?: number;
  as?: "div" | "li" | "article" | "header";
};

/**
 * Scroll reveal with zero JavaScript: CSS scroll-driven animation (animation-timeline: view()).
 * Runs on the compositor, respects prefers-reduced-motion, and degrades to static content
 * in browsers without scroll-timeline support.
 */
export function Reveal({ children, className = "", delay = 0, as: Tag = "div" }: Props) {
  return (
    <Tag className={`reveal ${className}`} style={delay ? ({ "--reveal-shift": `${Math.round(delay * 60)}%` } as React.CSSProperties) : undefined}>
      {children}
    </Tag>
  );
}
