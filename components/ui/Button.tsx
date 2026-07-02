"use client";

import { forwardRef, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * UniPost Button — inherits Bharvix's two-tier system, adds an `aurora` primary
 * for the product's hero CTA. Magnetic; arrow slides out-and-up; one primary
 * per eyeful.
 */
type Variant = "primary" | "aurora" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  magnetic?: boolean;
  external?: boolean;
  cursorLabel?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-6 py-3 text-sm",
  lg: "px-7 py-3.5 text-sm",
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-white text-black font-semibold hover:shadow-[0_0_40px_rgba(255,255,255,0.18)]",
  aurora:
    "text-black font-semibold hover:shadow-[0_0_50px_rgba(45,212,191,0.35)] [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)]",
  secondary:
    "border border-white/[0.14] bg-white/[0.04] text-white/75 font-medium backdrop-blur-sm hover:border-white/25 hover:text-white hover:bg-white/[0.08]",
  ghost: "text-white/60 font-medium hover:text-white link-underline",
};

const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  { children, href, variant = "primary", size = "lg", arrow = false, magnetic = true, external = false, cursorLabel, className, onClick },
  _ref
) {
  const localRef = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMouseMove = (e: React.MouseEvent) => {
    if (!magnetic || !localRef.current) return;
    const rect = localRef.current.getBoundingClientRect();
    setOffset({ x: (e.clientX - rect.left - rect.width / 2) * 0.3, y: (e.clientY - rect.top - rect.height / 2) * 0.4 });
  };
  const onMouseLeave = () => setOffset({ x: 0, y: 0 });

  const content = (
    <>
      <span className="relative z-10">{children}</span>
      {arrow && (
        <ArrowUpRight
          size={14}
          className="relative z-10 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      )}
    </>
  );

  const classes = cn(
    "group relative inline-flex items-center gap-2 overflow-hidden rounded-full transition-all duration-500",
    sizeClasses[size],
    variantClasses[variant],
    className
  );

  const motionProps = {
    ref: localRef as React.RefObject<HTMLAnchorElement & HTMLButtonElement>,
    className: classes,
    onMouseMove,
    onMouseLeave,
    onClick,
    animate: { x: offset.x, y: offset.y },
    transition: { type: "spring" as const, stiffness: 200, damping: 18, mass: 0.6 },
    ...(cursorLabel ? { "data-cursor-label": cursorLabel } : {}),
  };

  if (href) {
    return (
      <motion.a {...motionProps} href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
        {content}
      </motion.a>
    );
  }
  return (
    <motion.button {...motionProps} type="button">
      {content}
    </motion.button>
  );
});

export default Button;
