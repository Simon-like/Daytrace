"use client";

import * as SelectPrimitive from "@radix-ui/react-select";

interface SelectOption {
  readonly value: string;
  readonly label: string;
}

interface SelectProps {
  readonly id?: string;
  readonly value: string;
  readonly options: readonly SelectOption[];
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly container?: HTMLElement | null;
  readonly "aria-label": string;
}

function Chevron() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function Select({ id, value, options, onValueChange, disabled, container, "aria-label": ariaLabel }: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className="group inline-flex h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-[#d1dacd] bg-[#e9ede4] px-2.5 py-0 text-left text-sm text-ink shadow-[0_2px_0_#d6ddd1] outline-none transition-[border-color,background-color,box-shadow,transform] duration-[var(--motion-duration-control)] ease-[var(--motion-ease-standard)] hover:-translate-y-px hover:border-[#a9b7a2] hover:bg-[#f1f4ec] hover:shadow-[0_3px_0_#c8d1c2] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--focus-ring)] data-[state=open]:border-[#73866f] data-[state=open]:bg-[#f5f7f0] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
      >
        <span className="flex min-w-0 items-center gap-2.5"><span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#d7e0d1] text-[#405a45] transition-transform duration-[var(--motion-duration-control)] group-hover:-rotate-3"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3.5h7.5L13 6v6.5H3v-9Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/><path d="M10.5 3.5V6H13M5.5 8h5M5.5 10h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg></span><SelectPrimitive.Value /></span>
        <SelectPrimitive.Icon className="select-chevron inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#c8d2c3] bg-[#fffef8] text-[#50634f] shadow-xs"><Chevron /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal container={container}>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className="select-content z-50 max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[16px] border border-[#cbd5c5] bg-[#fffef8] p-2 text-ink shadow-[0_4px_0_rgba(194,204,187,0.75),0_20px_48px_rgba(32,39,32,0.16)]"
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex min-h-11 cursor-default select-none items-center rounded-[10px] py-2 pl-10 pr-3 text-sm outline-none transition-[color,background-color,transform] duration-[var(--motion-duration-control)] data-[highlighted]:translate-x-[2px] data-[highlighted]:bg-[#e5ebdf] data-[state=checked]:bg-[#edf1e7] data-[state=checked]:font-medium data-[state=checked]:text-[#31503d] data-[disabled]:opacity-40"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d7e0d1] text-[#31503d]">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
