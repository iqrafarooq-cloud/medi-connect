"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { Button } from "@medi-connect/ui/components/button";
import { cn } from "@medi-connect/ui/lib/utils";

/** Radix Select/Popover portals sit outside the dialog DOM and would otherwise count as outside presses. */
const NESTED_OVERLAY_SELECTOR = [
  "[data-radix-popper-content-wrapper]",
  "[data-radix-select-viewport]",
  "[data-slot=popover-content]",
  "[data-slot=select-content]",
  "[role=listbox]",
].join(",");

function isInsideNestedOverlay(node: EventTarget | null | undefined) {
  return node instanceof Element && Boolean(node.closest(NESTED_OVERLAY_SELECTOR));
}

function hasOpenNestedOverlay() {
  return Boolean(
    document.querySelector(
      [
        "[data-slot=popover-content]",
        "[data-slot=select-content]",
        "[data-radix-popper-content-wrapper]",
        "[data-radix-select-viewport]",
        "[role=listbox]",
      ].join(","),
    ),
  );
}

function Dialog({ onOpenChange, ...props }: DialogPrimitive.Root.Props) {
  return (
    <DialogPrimitive.Root
      data-slot="dialog"
      onOpenChange={(open, eventDetails) => {
        if (
          !open &&
          (eventDetails.reason === "outside-press" || eventDetails.reason === "focus-out")
        ) {
          const event = eventDetails.event;
          const target =
            eventDetails.reason === "focus-out" && "relatedTarget" in event
              ? (event.relatedTarget as EventTarget | null)
              : event.target;

          // Nested Radix portals live outside the dialog DOM. Focus-out often reports a null
          // relatedTarget before the portaled control receives focus, so also check the DOM.
          if (
            isInsideNestedOverlay(target) ||
            (eventDetails.reason === "focus-out" && hasOpenNestedOverlay())
          ) {
            eventDetails.cancel();
            return;
          }
        }

        onOpenChange?.(open, eventDetails);
      }}
      {...props}
    />
  );
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
        className={cn(
          "fixed inset-0 z-50 bg-foreground/40 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-[2px]",
          className,
        )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & { showCloseButton?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[min(90vh,720px)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-border bg-background p-0 text-foreground shadow-lg transition duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 sm:max-w-xl",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={<Button variant="ghost" className="absolute top-3.5 right-3.5" size="icon" />}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 px-6 py-5 pr-14 text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 px-6 py-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
