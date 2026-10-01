import { Minus, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { addAbsenceWithUndo } from '../../lib/absences'
import { ISO_DATE, todayISO } from '../../lib/logic'
import { actions, useAppState } from '../../lib/store'
import { useUI } from '../../lib/ui'
import { ErrorText, Field, Switch } from '../common'
import { Sheet } from '../Sheet'

type Props = { open: boolean; subjectId?: string; absenceId?: string; onClose: () => void }

export function AbsenceSheet({ open, subjectId, absenceId, onClose }: Props) {
  const state = useAppState()
  const ui = useUI()
  const subject = state.subjects.find((s) => s.id === subjectId)
  const absence = subject?.absences.find((a) => a.id === absenceId)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={absence ? 'Editar falta' : 'Añadir falta'}
      footer={
        <div className="flex gap-2">
          {subject && absence && (
            <button
              type="button"
              className="btn-soft text-rose-600 dark:text-rose-400"
              aria-label="Eliminar falta"
              onClick={() => {
                actions.removeAbsence(subject.id, absence.id)
                onClose()
                ui.toast('Falta eliminada', { label: 'Deshacer', run: () => actions.restoreAbsence(subject.id, absence) })
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button type="submit" form="absence-form" className="btn-primary flex-1">
            Guardar
          </button>
        </div>
      }
    >
      {subject && <AbsenceForm key={absenceId ?? 'new'} subjectId={subject.id} absenceId={absence?.id} onDone={onClose} />}
    </Sheet>
  )
}

function AbsenceForm({ subjectId, absenceId, onDone }: { subjectId: string; absenceId?: string; onDone: () => void }) {
  const ui = useUI()
  const state = useAppState()
  const absence = state.subjects.find((s) => s.id === subjectId)?.absences.find((a) => a.id === absenceId)

  const [date, setDate] = useState(absence?.date ?? todayISO())
  const [amount, setAmount] = useState(absence?.amount ?? 1)
  const [justified, setJustified] = useState(absence?.justified ?? false)
  const [note, setNote] = useState(absence?.note ?? '')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!ISO_DATE.test(date)) return setError('Elige una fecha.')
    const data = { date, amount, justified, note: note.trim().slice(0, 120) }
    if (absence) actions.updateAbsence(subjectId, absence.id, data)
    else addAbsenceWithUndo(ui, subjectId, data)
    onDone()
  }

  return (
    <form id="absence-form" onSubmit={submit} noValidate className="grid gap-5 pt-1 pb-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <Field label="Fecha">
          <input className="field-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div>
          <span className="field-label">Horas</span>
          <div className="flex h-12 items-center gap-1 rounded-2xl bg-soft p-1 ring-1 ring-line">
            <button type="button" aria-label="Una hora menos" disabled={amount <= 1} onClick={() => setAmount(amount - 1)} className="grid size-10 place-items-center rounded-xl text-fg transition hover:bg-card disabled:opacity-30">
              <Minus size={18} strokeWidth={2.5} />
            </button>
            <span className="w-7 text-center text-lg font-extrabold tabular-nums">{amount}</span>
            <button type="button" aria-label="Una hora más" onClick={() => setAmount(Math.min(20, amount + 1))} className="grid size-10 place-items-center rounded-xl text-fg transition hover:bg-card">
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-soft px-4 py-3.5">
        <div>
          <p className="font-bold">Falta justificada</p>
          <p className="text-sm text-muted">{state.settings.justifiedCount ? 'Cuenta para el límite (cámbialo en Ajustes).' : 'No cuenta para el límite.'}</p>
        </div>
        <Switch checked={justified} onChange={setJustified} label="Falta justificada" />
      </div>

      <Field label="Nota (opcional)">
        <input className="field-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="p. ej. médico, tren cancelado…" />
      </Field>

      <ErrorText>{error}</ErrorText>
    </form>
  )
}
