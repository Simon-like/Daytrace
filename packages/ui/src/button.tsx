import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "border-[#274332] bg-[#31503d] text-[#fffef7] shadow-[0_3px_0_#1b2e22,0_9px_22px_rgba(36,49,40,0.15)] hover:border-[#3d5d47] hover:bg-[#3d5d47] hover:shadow-[0_5px_0_#1b2e22,0_13px_26px_rgba(36,49,40,0.18)] active:shadow-[0_1px_0_#1b2e22,0_4px_10px_rgba(36,49,40,0.12)]",
  secondary: "border-[#cbd4c5] bg-[#fffef8] text-ink shadow-[0_2px_0_#d5ddd0] hover:border-[#9eac97] hover:bg-[#f2f5ec] hover:shadow-[0_3px_0_#c4cebd] active:shadow-[0_1px_0_#d5ddd0]",
  ghost: "border-transparent bg-transparent text-muted shadow-none hover:bg-[#e7ece1] hover:text-ink",
};

export function Button({ variant = "primary", className = "", type = "button", children, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`group inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] border px-5 py-2 text-sm font-medium tracking-[0.01em] transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--motion-duration-control)] ease-[var(--motion-ease-standard)] outline-none hover:-translate-y-[2px] active:translate-y-[2px] active:scale-[.985] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-revision disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:active:translate-y-0 disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    >
      <span>{children}</span>
      {variant === "primary" ? <span aria-hidden="true" className="ml-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-[background-color,transform] duration-[var(--motion-duration-control)] group-hover:translate-x-[3px] group-hover:bg-white/16 group-active:translate-x-0"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span> : null}
    </button>
  );
}
