import { createContext, useContext } from 'react'

export type SheetState =
  | null
  | { kind: 'add-menu' }
  | { kind: 'subject'; subjectId?: string }
  | { kind: 'absence'; subjectId: string; absenceId?: string }
  | { kind: 'settings' }
  | { kind: 'import' }
  | { kind: 'install-ios' }
  | { kind: 'rules' }
  | { kind: 'tutorial' }

export type ToastAction = { label: string; run: () => void }

export type UI = {
  sheet: SheetState
  openSheet: (s: SheetState) => void
  closeSheet: () => void
  toast: (text: string, action?: ToastAction) => void
}

export const UIContext = createContext<UI | null>(null)

export function useUI() {
  const ui = useContext(UIContext)
  if (!ui) throw new Error('useUI fuera de UIContext')
  return ui
}
