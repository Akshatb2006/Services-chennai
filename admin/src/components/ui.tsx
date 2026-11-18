"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, LoaderCircle, X } from "lucide-react";
import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "dark"; size?: "sm" | "md"; icon?: LucideIcon; loading?: boolean };

export function Button({ variant = "secondary", size = "md", icon: Icon, loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-pill font-semibold whitespace-nowrap transition-[background-color,border-color,opacity] disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-citrus text-ink hover:bg-citrus-hover",
        variant === "dark" && "bg-ink text-white hover:bg-ink-raised",
        variant === "secondary" && "border border-line-strong bg-card text-ink hover:border-ink/40",
        variant === "ghost" && "text-ink hover:bg-stone",
        variant === "danger" && "border border-error/30 bg-card text-error hover:bg-error/5",
        className,
      )}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : Icon ? <Icon className="size-4" aria-hidden strokeWidth={2} /> : null}
      {children}
    </button>
  );
}

const fieldBase = "w-full rounded-md border border-line-strong bg-card px-3 text-sm text-ink placeholder:text-muted outline-none focus:border-ink focus-visible:shadow-none";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} {...rest} className={cx(fieldBase, "h-10", className)} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} {...rest} className={cx(fieldBase, "h-10 pr-8", className)}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} {...rest} className={cx(fieldBase, "min-h-20 py-2", className)} />;
});

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold">
        {label}
      </label>
      {children}
      {error ? <p className="text-[13px] text-error" role="alert">{error}</p> : hint ? <p className="text-[13px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function Badge({ tone = "stone", children, className }: { tone?: "stone" | "citrus" | "ink" | "success" | "error" | "outline"; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1 rounded-pill px-2.5 text-xs font-semibold whitespace-nowrap",
        tone === "stone" && "bg-stone text-ink",
        tone === "citrus" && "bg-citrus text-ink",
        tone === "ink" && "bg-ink text-white",
        tone === "success" && "bg-success/12 text-success",
        tone === "error" && "bg-error/10 text-error",
        tone === "outline" && "border border-line-strong text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ title, action, children, className, padded = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cx("rounded-lg border border-line bg-card", className)}>
      {title ? (
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className={padded ? "p-4" : undefined}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-pill bg-stone">
        <Icon className="size-5" aria-hidden strokeWidth={1.75} />
      </span>
      <p className="mt-3 font-semibold">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted" role="status">
      <LoaderCircle className="size-4 animate-spin" aria-hidden /> {label}…
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
      <span>{message}</span>
      {onRetry ? (
        <Button size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[13px] text-muted">
      <span>
        {from}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page" />
        <span className="grid min-w-14 place-items-center text-ink">
          {page} / {pages}
        </span>
        <Button size="sm" variant="ghost" icon={ChevronRight} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page" />
      </div>
    </div>
  );
}

/** Native <dialog> modal: focus trap, Esc and backdrop come from the platform. */
export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx("m-auto w-[calc(100%-2rem)] rounded-xl border border-line bg-porcelain p-0 text-ink shadow-overlay", wide ? "max-w-3xl" : "max-w-lg")}
      aria-label={title}
    >
      {open ? (
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
            <button onClick={onClose} className="grid size-8 place-items-center rounded-pill hover:bg-stone" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-[minmax(120px,auto)_1fr]">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[13px] text-muted">{k}</dt>
          <dd className="text-sm">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
