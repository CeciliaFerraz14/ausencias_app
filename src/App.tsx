import { AnimatePresence } from 'motion/react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Home } from './components/Home'
import { Onboarding, tutorialPending } from './components/Onboarding'
import { UpdatePrompt } from './components/PwaPrompts'
import { AbsenceSheet } from './components/sheets/AbsenceSheet'
import { AddMenuSheet } from './components/sheets/AddMenuSheet'
import { ImportSheet } from './components/sheets/ImportSheet'
import { InstallIosSheet } from './components/sheets/InstallIosSheet'
import { RulesSheet } from './components/sheets/RulesSheet'
import { SettingsSheet } from './components/sheets/SettingsSheet'
import { SubjectSheet } from './components/sheets/SubjectSheet'
import { SubjectDetail } from './components/SubjectDetail'
import { Toast, type ToastData } from './components/Toast'
import { useRoute } from './lib/route'
import { useAppState } from './lib/store'
import { UIContext, type SheetState, type ToastAction, type UI } from './lib/ui'

export default function App() {
  const state = useAppState()
  const route = useRoute()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [toast, setToast] = useState<ToastData | null>(null)
  const [firstRun, setFirstRun] = useState(tutorialPending)
  const toastTimer = useRef<number | undefined>(undefined)

  const closeSheet = useCallback(() => setSheet(null), [])
  const showToast = useCallback((text: string, action?: ToastAction) => {
    window.clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text, action })
    toastTimer.current = window.setTimeout(() => setToast(null), action ? 5000 : 3000)
  }, [])

  const ui = useMemo<UI>(() => ({ sheet, openSheet: setSheet, closeSheet, toast: showToast }), [sheet, closeSheet, showToast])

  const subject = route.name === 'subject' ? state.subjects.find((s) => s.id === route.id) : undefined

  return (
    <UIContext.Provider value={ui}>
      {/* Fondo con brillos de color */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-32 size-[28rem] rounded-full bg-[var(--glow-1)] blur-3xl" />
        <div className="absolute -top-24 -right-40 size-[26rem] rounded-full bg-[var(--glow-2)] blur-3xl" />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {subject ? <SubjectDetail key={subject.id} subject={subject} state={state} /> : <Home key="home" state={state} />}
      </AnimatePresence>

      <AddMenuSheet open={sheet?.kind === 'add-menu'} onClose={closeSheet} />
      <SubjectSheet open={sheet?.kind === 'subject'} subjectId={sheet?.kind === 'subject' ? sheet.subjectId : undefined} onClose={closeSheet} />
      <AbsenceSheet
        open={sheet?.kind === 'absence'}
        subjectId={sheet?.kind === 'absence' ? sheet.subjectId : undefined}
        absenceId={sheet?.kind === 'absence' ? sheet.absenceId : undefined}
        onClose={closeSheet}
      />
      <SettingsSheet open={sheet?.kind === 'settings'} onClose={closeSheet} />
      <ImportSheet open={sheet?.kind === 'import'} onClose={closeSheet} />
      <InstallIosSheet open={sheet?.kind === 'install-ios'} onClose={closeSheet} />
      <RulesSheet open={sheet?.kind === 'rules'} onClose={closeSheet} />

      <Onboarding
        open={firstRun || sheet?.kind === 'tutorial'}
        withInstall={firstRun}
        onClose={() => {
          setFirstRun(false)
          closeSheet()
        }}
      />

      <Toast toast={toast} onDone={() => setToast(null)} />
      <UpdatePrompt />
    </UIContext.Provider>
  )
}
