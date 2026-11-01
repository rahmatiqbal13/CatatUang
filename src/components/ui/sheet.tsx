"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"

/** Mobile bottom sheet: grab handle, serif title, slides up from the bottom edge. */
function Sheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetContent({
  title,
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props & { title: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className="fixed inset-0 z-50 bg-[rgba(24,36,30,0.42)] duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-[24px] bg-[var(--surface)] px-5 pt-[10px] pb-[34px] text-[var(--text)] outline-none duration-300 data-open:animate-in data-open:slide-in-from-bottom-10 data-open:fade-in-0 data-closed:animate-out data-closed:slide-out-to-bottom-10 data-closed:fade-out-0",
          className
        )}
        {...props}
      >
        <div aria-hidden className="mx-auto mb-[14px] h-[5px] w-10 rounded-full bg-[var(--border-dashed)]" />
        <DialogPrimitive.Title className="font-heading mb-[14px] text-[28px] font-normal">{title}</DialogPrimitive.Title>
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

export { Sheet, SheetContent }
