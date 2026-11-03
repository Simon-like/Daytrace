"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

interface CheckboxProps {
  readonly id?: string;
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly "aria-label": string;
}

export function Checkbox({ id, checked, onCheckedChange, disabled, "aria-label": ariaLabel }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      id={id}
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      className="inline-flex size-5 min-h-5 shrink-0 cursor-pointer items-center justify-center rounded-[2px] border border-muted bg-transparent p-0 text-paper outline-none transition-colors duration-[var(--motion-duration-micro)] ease-[var(--motion-ease-standard)] hover:border-archive focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--focus-ring)] data-[state=checked]:border-archive data-[state=checked]:bg-archive data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45"
    >
      <CheckboxPrimitive.Indicator>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
