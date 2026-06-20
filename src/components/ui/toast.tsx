import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const toastVariants = cva(
  "pointer-events-auto flex w-80 items-start gap-2.5 rounded-lg border p-3 text-sm shadow-2xl ring-1 backdrop-blur transition-all duration-200",
  {
    variants: {
      variant: {
        success:
          "border-emerald-500/30 bg-neutral-900/95 text-white ring-emerald-500/40",
        info: "border-sky-500/30 bg-neutral-900/95 text-white ring-sky-500/40",
        alert:
          "border-red-500/40 bg-neutral-900/95 text-white ring-red-500/50",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

export type ToastVariant = NonNullable<VariantProps<typeof toastVariants>["variant"]>;

export type ToastProps = React.ComponentProps<"div"> & VariantProps<typeof toastVariants>;

function Toast({ className, variant, ...props }: ToastProps): React.JSX.Element {
  return (
    <div
      role="status"
      className={cn(toastVariants({ variant, className }))}
      {...props}
    />
  );
}

const ICONS: Record<ToastVariant, { Icon: typeof CheckCircle2; className: string }> = {
  success: { Icon: CheckCircle2, className: "text-emerald-400" },
  info: { Icon: Info, className: "text-sky-400" },
  alert: { Icon: AlertTriangle, className: "text-red-400" },
};

function ToastIcon({ variant }: { variant: ToastVariant }): React.JSX.Element {
  const { Icon, className } = ICONS[variant];
  return (
    <div className="mt-0.5 shrink-0">
      <Icon className={cn("size-5", className)} aria-hidden />
    </div>
  );
}

function ToastBody({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      className={cn(
        "min-w-0 flex-1 leading-snug [&_i]:mr-1 [&_i]:inline-block",
        className,
      )}
      {...props}
    />
  );
}

function ToastClose({
  className,
  ...props
}: React.ComponentProps<"button">): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label="閉じる"
      className={cn(
        "-mt-0.5 -mr-1 shrink-0 rounded p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white",
        className,
      )}
      {...props}
    >
      <X className="size-3.5" aria-hidden />
    </button>
  );
}

function ToastViewport({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      className={cn(
        "pointer-events-none fixed top-4 right-4 z-[2147483646] flex flex-col gap-2",
        className,
      )}
      {...props}
    />
  );
}

export { Toast, ToastBody, ToastClose, ToastIcon, ToastViewport, toastVariants };
