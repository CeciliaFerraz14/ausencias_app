import { Camera, ImagePlus, KeyRound, RefreshCw, Sparkles, TriangleAlert, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, getAccessCode, prepareImage, readTimetable, setAccessCode } from '../../lib/api'
import { allowedOf, COLORS, countHours, defaultCourse, formatSession, ISO_DATE, normName, uid, weeklyHours } from '../../lib/logic'
import { actions, update, useAppState } from '../../lib/store'
import type { Session } from '../../lib/types'
import { useUI } from '../../lib/ui'
import { ErrorText, Field } from '../common'
import { Sheet } from '../Sheet'

type Step = 'upload' | 'loading' | 'review'
// hours: duración del módulo escrita a mano ('' = usar la estimación del horario)
type Item = { include: boolean; name: string; schedule: Session[]; hours: string }

export function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>('upload')
  const [count, setCount] = useState(0)
  const [retry, setRetry] = useState<() => void>(() => () => {})
  useEffect(() => {
    if (open) setStep('upload')
  }, [open])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={step === 'review' ? 'Revisa tu horario' : 'Escanear horario'}
      footer={
        <div className="flex gap-2">
          {step === 'review' && (
            <button type="button" className="btn-soft" onClick={retry}>
              <RefreshCw size={17} /> Otra foto
            </button>
          )}
          <button type="submit" form="import-form" className="btn-primary flex-1" disabled={step === 'loading' || (step === 'review' && count === 0)}>
            {step === 'upload' && (
              <>
                <Sparkles size={18} /> Leer horario
              </>
            )}
            {step === 'loading' && 'Leyendo…'}
            {step === 'review' && (count === 1 ? 'Guardar 1 módulo' : `Guardar ${count} módulos`)}
          </button>
        </div>
      }
    >
      <ImportFlow onStep={setStep} onCount={setCount} onRetry={(fn) => setRetry(() => fn)} onDone={onClose} />
    </Sheet>
  )
}

function ImportFlow({
  onStep,
  onCount,
  onRetry,
  onDone,
}: {
  onStep: (s: Step) => void
  onCount: (n: number) => void
  onRetry: (fn: () => void) => void
  onDone: () => void
}) {
  const state = useAppState()
  const ui = useUI()
  const initial = state.settings.semester ?? defaultCourse()

  const [step, setStepLocal] = useState<Step>('upload')
  const [photo, setPhoto] = useState<{ dataUrl: string; base64: string } | null>(null)
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)
  const [needCode, setNeedCode] = useState(false)
  const [code, setCode] = useState(getAccessCode)
  const [items, setItems] = useState<Item[]>([])
  const [warnings, setWarnings] = useState('')
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const setStep = (s: Step) => {
    setStepLocal(s)
    onStep(s)
  }

  useEffect(() => () => abortRef.current?.abort(), [])
  useEffect(() => onRetry(() => () => {
    setError('')
    setStep('upload')
  }), [])

  const periodError = !ISO_DATE.test(start) || !ISO_DATE.test(end)
    ? 'Indica cuándo empiezan y terminan las clases.'
    : start > end
      ? 'La fecha de fin debe ser posterior a la de inicio.'
      : ''

  const included = items.filter((x) => x.include && x.schedule.length && x.name.trim())
  useEffect(() => onCount(included.length), [included.length])

  const existingByName = new Map(state.subjects.map((s) => [normName(s.name), s]))

  /** Duración del módulo: la escrita a mano o, si no, la estimada con el horario y las fechas. */
  function hoursOf(item: Item) {
    const manual = Number(item.hours)
    if (item.hours !== '' && Number.isInteger(manual) && manual >= 1) return manual
    return periodError ? null : Math.max(1, countHours(item.schedule, start, end))
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return
    setError('')
    try {
      setPhoto(await prepareImage(file))
    } catch {
      setPhoto(null)
      setError('No se ha podido abrir esa imagen. Prueba con una foto en JPG o PNG.')
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (step === 'loading') return
    setError('')
    if (periodError) return setError(periodError)
    if (step === 'review') return save()
    if (!photo) return setError('Primero haz o elige una foto de tu horario.')
    if (needCode) setAccessCode(code)

    actions.setSettings({ semester: { start, end } })
    setStep('loading')
    abortRef.current = new AbortController()
    try {
      const result = await readTimetable(photo.base64, abortRef.current.signal)
      if (!result.subjects.length) {
        setError(result.warnings || 'No he encontrado módulos en la foto. Prueba con otra más nítida.')
        setStep('upload')
        return
      }
      setItems(result.subjects.map((s) => ({ ...s, include: true, hours: '' })))
      setWarnings(result.warnings)
      setNeedCode(false)
      setStep('review')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setStep('upload')
      if (err instanceof ApiError) {
        if (err.code === 'access_code') setNeedCode(true)
        setError(err.message)
      } else {
        setError('Algo ha fallado al leer el horario. Vuelve a intentarlo.')
      }
    } finally {
      abortRef.current = null
    }
  }

  function save() {
    if (!included.length) return
    let created = 0
    let updated = 0
    update((d) => {
      for (const item of included) {
        const data = {
          name: item.name.trim().slice(0, 60),
          schedule: item.schedule,
          totalHours: hoursOf(item) ?? 1,
        }
        const existing = d.subjects.find((s) => normName(s.name) === normName(data.name))
        if (existing) {
          Object.assign(existing, data)
          updated++
        } else {
          d.subjects.push({
            id: uid(),
            color: COLORS[d.subjects.length % COLORS.length],
            createdAt: Date.now(),
            absences: [],
            ...data,
          })
          created++
        }
      }
      d.settings.semester = { start, end }
    })
    navigator.storage?.persist?.().catch(() => {})
    onDone()
    const parts = []
    if (created) parts.push(`${created} ${created === 1 ? 'módulo añadido' : 'módulos añadidos'}`)
    if (updated) parts.push(`${updated} ${updated === 1 ? 'actualizado' : 'actualizados'}`)
    ui.toast(`✨ ${parts.join(' · ')}`)
  }

  const patchItem = (i: number, patch: Partial<Item>) => setItems((list) => list.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  return (
    <form id="import-form" onSubmit={submit} noValidate className="grid gap-5 pt-1 pb-2">
      {step !== 'review' ? (
        <div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
          {photo ? (
            <div className="relative overflow-hidden rounded-3xl bg-soft ring-1 ring-line">
              <img src={photo.dataUrl} alt="Foto del horario" className="max-h-72 w-full object-contain" />
              {step === 'loading' ? (
                <>
                  <div className="absolute inset-0 bg-violet-950/30" />
                  <motion.div
                    className="absolute inset-x-0 h-24 bg-linear-to-b from-transparent via-fuchsia-400/50 to-transparent"
                    initial={{ top: '-30%' }}
                    animate={{ top: ['-30%', '100%'] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-linear-to-t from-black/60 to-transparent p-4 text-sm font-bold text-white">
                    <Sparkles size={16} className="animate-pulse" /> Leyendo tu horario… (10-30 s)
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="glass absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-sm font-bold text-white"
                >
                  <Camera size={15} /> Cambiar
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative grid w-full place-items-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed border-violet-400/40 bg-violet-500/5 px-6 py-9 text-center transition hover:border-violet-500 hover:bg-violet-500/10"
            >
              <motion.span
                className="brand-gradient grid size-16 place-items-center rounded-3xl text-white shadow-lg shadow-fuchsia-600/30"
                whileHover={{ rotate: -6, scale: 1.05 }}
              >
                <ImagePlus size={28} />
              </motion.span>
              <span>
                <b className="block text-[17px]">Haz o elige una foto</b>
                <span className="text-sm text-muted">Que se vean bien los días, las horas y los módulos.</span>
              </span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {warnings && (
            <p className="flex gap-2.5 rounded-2xl bg-amber-500/12 p-3.5 text-sm font-medium text-amber-800 dark:text-amber-200">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" /> {warnings}
            </p>
          )}
          <AnimatePresence initial={false}>
            {items.map((item, i) => {
              const total = hoursOf(item)
              const allowed = total == null ? null : allowedOf(total)
              const match = existingByName.get(normName(item.name))
              const color = match?.color ?? COLORS[(state.subjects.length + i) % COLORS.length]
              return (
                <motion.div
                  key={i}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: item.include ? 1 : 0.5, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-3xl bg-soft p-3.5 ring-1 ring-line"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.include}
                      onChange={(e) => patchItem(i, { include: e.target.checked })}
                      className="size-5 shrink-0 accent-violet-600"
                      aria-label={`Incluir ${item.name}`}
                    />
                    <span className="size-3 shrink-0 rounded-full" style={{ background: color }} />
                    <input
                      value={item.name}
                      onChange={(e) => patchItem(i, { name: e.target.value })}
                      maxLength={60}
                      aria-label="Nombre del módulo"
                      className="min-w-0 flex-1 rounded-xl bg-card px-3 py-2 font-bold ring-1 ring-line outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 pl-8">
                    {item.schedule.map((x, j) => (
                      <span key={j} className="inline-flex items-center gap-1 rounded-full bg-card py-1 pr-1 pl-3 text-xs font-bold tabular-nums ring-1 ring-line">
                        {formatSession(x)}
                        <button
                          type="button"
                          aria-label={`Quitar ${formatSession(x)}`}
                          onClick={() => {
                            const schedule = item.schedule.filter((_, k) => k !== j)
                            patchItem(i, { schedule, include: schedule.length > 0 && item.include })
                          }}
                          className="grid size-5 place-items-center rounded-full text-muted hover:bg-rose-500/15 hover:text-rose-600"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      </span>
                    ))}
                  </div>
                  {total != null && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-8 text-xs font-medium text-muted">
                      <label className="inline-flex items-center gap-1.5">
                        <span>{weeklyHours(item.schedule)} h/sem · Duración</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={item.hours === '' ? total : item.hours}
                          onChange={(e) => patchItem(i, { hours: e.target.value })}
                          aria-label={`Duración de ${item.name} en horas`}
                          className="w-16 rounded-lg bg-card px-2 py-1 text-center font-bold text-fg ring-1 ring-line outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <span>h</span>
                      </label>
                      <span>
                        · podrás faltar <b className="text-fg">{allowed} h</b>
                        {match && <> · actualizará «{match.name}»</>}
                      </span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <fieldset className="grid gap-3" disabled={step === 'loading'}>
        <legend className="field-label">Periodo lectivo del curso</legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Empieza">
            <input className="field-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Termina">
            <input className="field-input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <p className="-mt-1 text-sm text-muted">
          Si te matriculaste más tarde, pon tu fecha de matrícula.
          {step === 'review' && ' La duración de cada módulo es una estimación con tu horario (sin Navidad): corrígela con la de la programación didáctica.'}
        </p>
      </fieldset>

      {needCode && step !== 'review' && (
        <Field label="Código de clase">
          <div className="relative">
            <KeyRound size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
            <input
              className="field-input pl-11"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Pídeselo a quien gestiona la app"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </div>
        </Field>
      )}

      <ErrorText>{error}</ErrorText>
    </form>
  )
}
