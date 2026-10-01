import { Plus } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'

export function IconButton({ label, onClick, children, glass }: { label: string; onClick: () => void; children: ReactNode; glass?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        glass
          ? 'glass grid size-11 place-items-center rounded-2xl text-white transition active:scale-95'
          : 'grid size-11 place-items-center rounded-2xl bg-card text-fg shadow-sm ring-1 ring-line transition hover:text-violet-600 active:scale-95'
      }
    >
      {children}
    </button>
  )
}

export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-40 mx-auto flex max-w-2xl justify-end px-4">
      <motion.button
        type="button"
        onClick={onClick}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', damping: 18, stiffness: 300, delay: 0.15 }}
        className="brand-gradient pointer-events-auto flex h-15 items-center gap-2 rounded-[1.4rem] pr-6 pl-5 text-base font-bold text-white shadow-xl shadow-fuchsia-600/35"
      >
        <Plus size={24} strokeWidth={2.75} />
        {label}
      </motion.button>
    </div>
  )
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between px-1">
      <h2 className="text-lg font-extrabold tracking-tight">{children}</h2>
      {aside && <span className="text-sm font-medium text-muted">{aside}</span>}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? 'bg-violet-600' : 'bg-muted/30'}`}
    >
      <motion.span
        className="absolute top-1 left-1 size-6 rounded-full bg-white shadow"
        animate={{ x: checked ? 24 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  )
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">
      {children}
    </p>
  )
}
