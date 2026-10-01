import { Check, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { allowedOf, COLORS, countHours, LIMIT_PERCENT, plural, weeklyHours } from '../../lib/logic'
import { goHome } from '../../lib/route'
import { actions, useAppState } from '../../lib/store'
import { useUI } from '../../lib/ui'
import { ErrorText, Field } from '../common'
import { Sheet } from '../Sheet'

export function SubjectSheet({ open, subjectId, onClose }: { open: boolean; subjectId?: string; onClose: () => void }) {
  const state = useAppState()
  const subject = subjectId ? state.subjects.find((s) => s.id === subjectId) : undefined
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={subject ? 'Editar módulo' : 'Nuevo módulo'}
      footer={
        <div className="flex gap-2">
          {subject && <DeleteSubjectButton id={subject.id} name={subject.name} onDone={onClose} />}
          <button type="submit" form="subject-form" className="btn-primary flex-1">
            Guardar
          </button>
        </div>
      }
    >
      <SubjectForm key={subjectId ?? 'new'} subjectId={subjectId} onDone={onClose} />
    </Sheet>
  )
}

function DeleteSubjectButton({ id, name, onDone }: { id: string; name: string; onDone: () => void }) {
  return (
    <button
      type="button"
      className="btn-soft text-rose-600 dark:text-rose-400"
      aria-label="Eliminar módulo"
      onClick={() => {
        if (!confirm(`¿Eliminar «${name}» y todas sus faltas?`)) return
        actions.deleteSubject(id)
        onDone()
        goHome()
      }}
    >
      <Trash2 size={18} />
    </button>
  )
}

function SubjectForm({ subjectId, onDone }: { subjectId?: string; onDone: () => void }) {
  const state = useAppState()
  const ui = useUI()
  const subject = subjectId ? state.subjects.find((s) => s.id === subjectId) : undefined

  const [name, setName] = useState(subject?.name ?? '')
  const [color, setColor] = useState(subject?.color ?? COLORS[state.subjects.length % COLORS.length])
  const [total, setTotal] = useState(subject ? String(subject.totalHours) : '')
  const [error, setError] = useState('')
  const sem = state.settings.semester
  const estimate = subject?.schedule.length && sem ? countHours(subject.schedule, sem.start, sem.end) : null

  const totalN = Number(total)
  const valid = Number.isInteger(totalN) && totalN >= 1
  const preview = valid ? allowedOf(totalN) : null

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Ponle un nombre al módulo.')
    if (!valid) return setError('Indica la duración del módulo en horas.')
    const data = { name: name.trim().slice(0, 60), color, totalHours: totalN }
    if (subject) {
      actions.updateSubject(subject.id, data)
    } else {
      actions.addSubject({ ...data, schedule: [] })
      ui.toast(`«${data.name}» añadido`)
    }
    onDone()
  }

  return (
    <form id="subject-form" onSubmit={submit} noValidate className="grid gap-5 pt-1 pb-2">
      <Field label="Nombre">
        <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="p. ej. Programación" autoFocus={!subject} />
      </Field>

      <div>
        <span className="field-label">Color</span>
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Color">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={`Color ${c}`}
              onClick={() => setColor(c)}
              className="grid size-10 place-items-center rounded-full text-white transition active:scale-90"
              style={{ background: c, boxShadow: color === c ? `0 0 0 3px var(--card), 0 0 0 5px ${c}` : undefined }}
            >
              {color === c && <Check size={18} strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Field label="Duración del módulo (horas)">
          <input className="field-input" type="number" inputMode="numeric" min={1} value={total} onChange={(e) => setTotal(e.target.value)} placeholder="128" />
        </Field>
        <p className="mt-2 text-sm text-muted">
          La que aparece en la programación didáctica del módulo.
          {estimate != null && subject && (
            <>
              {' '}
              Según tu horario ({plural(weeklyHours(subject.schedule), 'hora')}/semana) serían unas{' '}
              <button type="button" className="font-bold text-violet-600 underline dark:text-violet-300" onClick={() => setTotal(String(estimate))}>
                {estimate} h
              </button>
              .
            </>
          )}
        </p>
      </div>

      {preview != null && (
        <div className="flex items-center gap-3 rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color}, #ff4fa3 35%))` }}>
          <b className="text-3xl font-extrabold tabular-nums">{preview}</b>
          <span className="text-sm leading-snug font-semibold text-white/90">
            {preview === 0
              ? 'Con una sola falta perderías la evaluación continua.'
              : `${plural(preview, 'hora', 'horas')} de falta como máximo. Con la siguiente llegarías al ${LIMIT_PERCENT} % y perderías la evaluación continua.`}
          </span>
        </div>
      )}

      <ErrorText>{error}</ErrorText>
    </form>
  )
}
