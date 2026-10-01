import { plural, stats, vibrate } from './logic'
import { actions, getState } from './store'
import type { Absence } from './types'
import type { UI } from './ui'

/** Anota una falta y muestra un aviso con lo que queda y la opción de deshacer. */
export function addAbsenceWithUndo(ui: UI, subjectId: string, absence: Omit<Absence, 'id'>) {
  const id = actions.addAbsence(subjectId, absence)
  vibrate()
  const { subjects, settings } = getState()
  const s = subjects.find((x) => x.id === subjectId)
  if (!s) return
  const st = stats(s, settings.justifiedCount)
  const text =
    st.remaining > 0
      ? `${s.name}: te ${st.remaining === 1 ? 'queda' : 'quedan'} ${plural(st.remaining, 'falta')}`
      : st.remaining === 0
        ? `${s.name}: no te quedan faltas`
        : `${s.name}: has superado el límite`
  ui.toast(text, { label: 'Deshacer', run: () => actions.removeAbsence(subjectId, id) })
}
