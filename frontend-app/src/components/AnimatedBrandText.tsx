import React, { useState, useRef, useEffect } from 'react';

interface AnimatedBrandTextProps {
  className?: string;
  text?: string;
}

const GRADIENT = 'linear-gradient(90deg, #8e2de2 0%, #5d4cd8 38%, #4c8cdc 66%, #2bdde6 100%)';

export const AnimatedBrandText: React.FC<AnimatedBrandTextProps> = ({
  className = '',
  text = 'JuaLuma',
}) => {
  const letters = text.split('');
  const [scales, setScales] = useState<number[]>(() => letters.map(() => 1));
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const px = e.clientX;
    const py = e.clientY;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const radius = 48;
      const next = letters.map((_, i) => {
        const node = charRefs.current[i];
        if (!node) return 1;
        const r = node.getBoundingClientRect();
        const dx = Math.abs(px - (r.left + r.width / 2));
        const dy = Math.abs(py - (r.top + r.height / 2));
        const dist = Math.hypot(dx, dy);
        return 1 + 0.4 * Math.max(0, 1 - dist / radius);
      });
      setScales(next);
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setScales(letters.map(() => 1));
  };

  return (
    <span
      className={`font-bold tracking-tight select-none ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {letters.map((letter, i) => (
        <span
          key={`${letter}-${i}`}
          ref={(el) => { charRefs.current[i] = el; }}
          aria-hidden="true"
          style={{
            display: 'inline-block',
            transform: `scale(${scales[i]})`,
            transformOrigin: 'center bottom',
            transition: 'transform 130ms cubic-bezier(0.22, 1, 0.36, 1)',
            backgroundImage: GRADIENT,
            backgroundSize: `${letters.length * 100}% 100%`,
            backgroundPosition: `${(i / Math.max(letters.length - 1, 1)) * 100}% 0%`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 11px rgba(109, 129, 224, 0.28)',
          }}
        >
          {letter}
        </span>
      ))}
      <span className="sr-only">{text}</span>
    </span>
  );
};
