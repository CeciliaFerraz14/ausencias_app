import { Briefcase, CalendarRange, Download, GraduationCap, KeyRound, Plus, Scale, Smartphone, Trash2, Upload, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { getAccessCode, setAccessCode } from '../../lib/api'
import { defaultCourse, fromISO, ISO_DATE, plural, toISO, todayISO } from '../../lib/logic'
import { useInstall } from '../../lib/pwa'
import { actions, getState, normalize, replaceState, resetState, useAppState } from '../../lib/store'
import type { Period, Semester } from '../../lib/types'
import { useUI } from '../../lib/ui'
import { ErrorText, Switch } from '../common'
import { Sheet } from '../Sheet'

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Ajustes">
      <SettingsBody onClose={onClose} />
    </Sheet>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-xs font-bold tracking-wider text-muted uppercase">{title}</h3>
      <div className="divide-y divide-line overflow-hidden rounded-3xl bg-soft">{children}</div>
    </section>
  )
}

function Row({ icon, children, onClick, danger }: { icon: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left font-semibold transition hover:bg-card ${danger ? 'text-rose-600 dark:text-rose-400' : ''}`}>
      <span className="grid size-9 place-items-center rounded-xl bg-card ring-1 ring-line">{icon}</span>
      {children}
    </button>
  )
}

function SettingsBody({ onClose }: { onClose: () => void }) {
  const state = useAppState()
  const ui = useUI()
  const install = useInstall()
  const [code, setCode] = useState(getAccessCode)
  const fileRef = useRef<HTMLInputElement>(null)

  function exportData() {
    const blob = new Blob([JSON.stringify({ app: 'ausencias', version: 1, exportedAt: new Date().toISOString(), ...getState() }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ausencias-${todayISO()}.json`
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  async function importData(file: File) {
    try {
      const data = normalize(JSON.parse(await file.text()))
      if (!confirm(`Se importarán ${plural(data.subjects.length, 'módulo')} y se reemplazarán tus datos actuales. ¿Continuar?`)) return
      replaceState(data)
      onClose()
      ui.toast('Datos importados')
    } catch {
      alert('El archivo no es una copia de seguridad válida.')
    }
  }

  return (
    <div className="grid gap-6 pt-1 pb-2">
      <CoursePeriod />

      <Group title="Faltas">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div>
            <p className="font-semibold">Las justificadas cuentan</p>
            <p className="text-sm text-muted">Para el 15 % cuentan todas las faltas; desactívalo solo si tu centro no las computa.</p>
          </div>
          <Switch checked={state.settings.justifiedCount} onChange={(v) => actions.setSettings({ justifiedCount: v })} label="Las faltas justificadas cuentan" />
        </div>
        <Row icon={<Scale size={17} />} onClick={() => ui.openSheet({ kind: 'rules' })}>
          Normativa (Decreto 91/2024)
        </Row>
        <Row icon={<GraduationCap size={17} />} onClick={() => ui.openSheet({ kind: 'tutorial' })}>
          Ver el tutorial
        </Row>
      </Group>

      <Group title="Escanear horarios">
        <label className="flex items-center gap-3 px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card ring-1 ring-line">
            <KeyRound size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-muted">Código de clase</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onBlur={() => setAccessCode(code)}
              placeholder="Te lo pasa quien gestiona la app"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent py-0.5 font-semibold outline-none placeholder:font-normal placeholder:text-muted/70"
            />
          </span>
        </label>
      </Group>

      {(install.canPrompt || install.iosManual) && (
        <Group title="App">
          <Row
            icon={<Smartphone size={17} />}
            onClick={() => (install.canPrompt ? install.prompt() : ui.openSheet({ kind: 'install-ios' }))}
          >
            Instalar en este dispositivo
          </Row>
        </Group>
      )}

      <Group title="Copia de seguridad">
        <Row icon={<Download size={17} />} onClick={exportData}>
          Exportar datos
        </Row>
        <Row icon={<Upload size={17} />} onClick={() => fileRef.current?.click()}>
          Importar datos
        </Row>
        <Row
          danger
          icon={<Trash2 size={17} />}
          onClick={() => {
            if (!confirm('Se borrarán todos tus módulos y faltas. No se puede deshacer. ¿Continuar?')) return
            resetState()
            onClose()
          }}
        >
          Borrar todos los datos
        </Row>
      </Group>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) importData(f)
        }}
      />

      <p className="px-1 text-center text-xs text-muted">Tus datos se guardan solo en este dispositivo. Exporta una copia para pasarlos a otro móvil.</p>
    </div>
  )
}

function CoursePeriod() {
  const state = useAppState()
  const ui = useUI()
  const saved = state.settings.semester
  const initial = saved ?? { ...defaultCourse(), internships: [] }
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)
  const [internships, setInternships] = useState<Period[]>(initial.internships)
  const [error, setError] = useState('')
  const draft: Semester = { start, end, internships }
  const dirty = !saved || JSON.stringify(draft) !== JSON.stringify(saved)

  const patchInternship = (i: number, patch: Partial<Period>) =>
    setInternships((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  function addInternship() {
    // Propone un mes entero a mitad de curso como punto de partida para ajustarlo.
    const from = ISO_DATE.test(start) ? fromISO(start) : new Date()
    from.setMonth(from.getMonth() + 5, 1)
    const until = new Date(from.getFullYear(), from.getMonth() + 1, 0)
    setInternships((list) => [...list, { start: toISO(from), end: toISO(until) }])
  }

  function save() {
    if (!ISO_DATE.test(start) || !ISO_DATE.test(end)) return setError('Indica cuándo empiezan y terminan las clases.')
    if (start > end) return setError('La fecha de fin del curso debe ser posterior a la de inicio.')
    for (const p of internships) {
      if (!ISO_DATE.test(p.start) || !ISO_DATE.test(p.end)) return setError('Indica cuándo empiezan y terminan las prácticas.')
      if (p.start > p.end) return setError('La fecha de fin de las prácticas debe ser posterior a la de inicio.')
      if (p.start < start || p.end > end) return setError('Las prácticas tienen que estar dentro del curso.')
    }
    setError('')
    const sorted = [...internships].sort((a, b) => a.start.localeCompare(b.start))
    setInternships(sorted)
    const recalculated = actions.setSemester({ start, end, internships: sorted })
    ui.toast(recalculated ? `Fechas guardadas · ${plural(recalculated, 'módulo')} recalculado${recalculated === 1 ? '' : 's'}` : 'Fechas guardadas')
  }

  return (
    <Group title="Curso">
      <div className="grid gap-3 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card ring-1 ring-line">
            <CalendarRange size={17} />
          </span>
          <p className="font-semibold">Periodo lectivo</p>
        </div>
        <DateRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
      </div>

      <div className="grid gap-3 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card ring-1 ring-line">
            <Briefcase size={17} />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">Prácticas en empresa</p>
            <p className="text-sm text-muted">Esos días no hay clase ni cuentan como faltas escolares.</p>
          </div>
        </div>
        {internships.map((p, i) => (
          <div key={i} className="flex items-end gap-2">
            <DateRange start={p.start} end={p.end} onStart={(v) => patchInternship(i, { start: v })} onEnd={(v) => patchInternship(i, { end: v })} />
            <button
              type="button"
              aria-label="Quitar periodo de prácticas"
              onClick={() => setInternships((list) => list.filter((_, j) => j !== i))}
              className="grid size-12 shrink-0 place-items-center rounded-2xl text-muted transition hover:bg-rose-500/15 hover:text-rose-600"
            >
              <X size={18} />
            </button>
          </div>
        ))}
        <button type="button" className="btn-soft justify-self-start" onClick={addInternship}>
          <Plus size={17} /> Añadir periodo de prácticas
        </button>
      </div>

      <div className="grid gap-3 px-4 py-3.5">
        <p className="text-sm text-muted">
          Al guardar se recalcula la duración de los módulos con su horario. Las duraciones que corregiste a mano se mantienen.
        </p>
        <ErrorText>{error}</ErrorText>
        {dirty && (
          <button type="button" className="btn-primary" onClick={save}>
            Guardar fechas
          </button>
        )}
      </div>
    </Group>
  )
}

function DateRange({ start, end, onStart, onEnd }: { start: string; end: string; onStart: (v: string) => void; onEnd: (v: string) => void }) {
  return (
    <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
      <label className="block min-w-0">
        <span className="block text-sm font-semibold text-muted">Empieza</span>
        <input className="field-input" type="date" value={start} onChange={(e) => onStart(e.target.value)} />
      </label>
      <label className="block min-w-0">
        <span className="block text-sm font-semibold text-muted">Termina</span>
        <input className="field-input" type="date" value={end} onChange={(e) => onEnd(e.target.value)} />
      </label>
    </div>
  )
}
