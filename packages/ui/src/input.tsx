import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`h-12 w-full min-w-0 appearance-none rounded-[10px] border border-line bg-paper-light px-4 py-0 text-base text-ink shadow-[inset_0_1px_2px_rgba(36,49,40,0.035)] outline-none transition-[border-color,background-color,box-shadow] duration-[var(--motion-duration-micro)] ease-[var(--motion-ease-standard)] placeholder:text-muted/70 hover:border-[#aeb8a8] focus:border-archive focus:bg-[#fcfcf8] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none ${className}`}
      {...props}
    />
  );
});
