import { CalendarDays, ChevronLeft, Clock, Info, Pencil, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import type { CSSProperties } from 'react'
import { blockHours, formatMonth, formatSession, fromISO, LIMIT_PERCENT, lossThreshold, plural, stats, STATUS_META, statusLabel, WEEKDAYS, weeklyHours } from '../lib/logic'
import { goHome } from '../lib/route'
import type { AppState, Subject } from '../lib/types'
import { useUI } from '../lib/ui'
import { Fab, IconButton, SectionTitle } from './common'
import { Ring } from './Ring'

export function SubjectDetail({ subject: s, state }: { subject: Subject; state: AppState }) {
  const ui = useUI()
  const st = stats(s, state.settings.justifiedCount)
  const fraction = st.allowed > 0 ? st.used / st.allowed : st.used > 0 ? 1 : 0
  const basis = `${LIMIT_PERCENT} % de ${s.totalHours} h`
  const threshold = lossThreshold(s.totalHours)

  const pill = {
    ok: 'Vas bien, sigue así',
    warn: 'Has gastado más de la mitad',
    danger: st.remaining === 0 ? 'Estás al límite' : 'Te queda poco margen',
    over: 'Sin evaluación continua',
  }[st.status]

  // Historial agrupado por mes, de lo más reciente a lo más antiguo.
  const sorted = [...s.absences].sort((a, b) => b.date.localeCompare(a.date))
  const groups: { month: string; items: typeof sorted }[] = []
  for (const a of sorted) {
    const month = formatMonth(a.date)
    if (groups.at(-1)?.month !== month) groups.push({ month, items: [] })
    groups.at(-1)!.items.push(a)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="pb-36"
      style={{ '--c': s.color } as CSSProperties}
    >
      <section className="subject-gradient relative overflow-hidden rounded-b-[2.5rem] px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-12 text-white shadow-xl shadow-black/10">
        <div className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-white/12" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full bg-white/10" />

        <div className="relative mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <IconButton glass label="Volver" onClick={goHome}>
              <ChevronLeft size={24} strokeWidth={2.5} />
            </IconButton>
            <IconButton glass label="Editar módulo" onClick={() => ui.openSheet({ kind: 'subject', subjectId: s.id })}>
              <Pencil size={19} strokeWidth={2.25} />
            </IconButton>
          </div>

          <h1 className="mt-3 text-center text-[1.75rem] leading-tight font-extrabold tracking-tight text-balance">{s.name}</h1>
          <p className="mt-1 text-center text-sm font-semibold text-white/80">{basis}</p>

          <div className="mt-6 flex justify-center">
            <Ring size={196} stroke={15} fraction={fraction} color="#ffffff" track="rgba(255,255,255,0.22)">
              <div>
                <motion.b
                  key={st.remaining}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 14, stiffness: 260 }}
                  className="block text-[4rem] leading-none font-extrabold tabular-nums"
                >
                  {Math.abs(st.remaining)}
                </motion.b>
                <span className="mt-1 block text-sm font-bold text-white/85">
                  {st.remaining < 0 ? (st.remaining === -1 ? 'falta de más' : 'faltas de más') : st.remaining === 1 ? 'falta te queda' : 'faltas te quedan'}
                </span>
              </div>
            </Ring>
          </div>

          <div className="mt-5 flex justify-center">
            <span className="glass inline-flex items-center gap-2 rounded-full py-1.5 pr-4 pl-2 text-sm font-bold">
              <span className="size-3 rounded-full ring-2 ring-white/70" style={{ background: STATUS_META[st.status].color }} />
              {pill}
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4">
        <div className="relative -mt-8 grid grid-cols-3 gap-3">
          <Tile value={st.allowed} label="permitidas" />
          <Tile value={st.used} label="usadas" />
          <Tile value={st.justified} label="justificadas" />
        </div>

        <button
          type="button"
          onClick={() => ui.openSheet({ kind: 'rules' })}
          className="card mt-4 flex w-full items-center gap-3 p-4 text-left text-sm transition active:scale-[0.99]"
        >
          <Info size={18} className="shrink-0 text-violet-600 dark:text-violet-300" />
          <span className="text-muted">
            {st.remaining < 0 ? 'Has llegado' : 'Pierdes la evaluación continua al llegar'} a <b className="text-fg">{plural(threshold, 'falta')}</b>
            {' '}({basis}). 1 falta = 1 hora lectiva.
          </span>
        </button>

        {s.schedule.length > 0 && (
          <section className="mt-8">
            <SectionTitle aside={`${plural(weeklyHours(s.schedule), 'hora')}/semana`}>Horario</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {s.schedule.map((x) => (
                <span key={formatSession(x)} className="card inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold">
                  <span className="rounded-lg px-1.5 py-0.5 text-xs font-extrabold text-white subject-gradient">{WEEKDAYS[x.weekday - 1]}</span>
                  <span className="tabular-nums">
                    {x.start}–{x.end}
                  </span>
                  <span className="text-xs text-muted">{blockHours(x)} h</span>
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <SectionTitle aside={plural(s.absences.length, 'registro')}>Historial</SectionTitle>
          {groups.length === 0 ? (
            <div className="card flex items-center gap-4 p-5">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="font-bold">Sin faltas por ahora</p>
                <p className="text-sm text-muted">Cuando faltes, añádela con el botón de abajo.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-5">
              {groups.map((g) => (
                <div key={g.month}>
                  <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold tracking-wider text-muted uppercase">
                    <CalendarDays size={13} strokeWidth={2.5} /> {g.month}
                  </p>
                  <ul className="card divide-y divide-line overflow-hidden">
                    {g.items.map((a) => {
                      const d = fromISO(a.date)
                      return (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => ui.openSheet({ kind: 'absence', subjectId: s.id, absenceId: a.id })}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-soft"
                          >
                            <div className="grid w-12 shrink-0 place-items-center rounded-2xl bg-soft py-1.5">
                              <span className="text-lg leading-none font-extrabold" style={{ color: s.color }}>
                                {d.getDate()}
                              </span>
                              <span className="text-[11px] font-bold text-muted uppercase">{WEEKDAYS[(d.getDay() + 6) % 7]}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold">{a.amount === 1 ? '1 hora' : `${a.amount} horas`}</p>
                              {a.note && <p className="truncate text-sm text-muted">{a.note}</p>}
                              {!a.note && a.slot && (
                                <p className="flex items-center gap-1 text-sm text-muted">
                                  <Clock size={12} /> Desde «Hoy»
                                </p>
                              )}
                            </div>
                            {a.justified && (
                              <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                Justificada
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-muted">{statusLabel(st)} · {plural(st.used, 'falta contada', 'faltas contadas')}</p>
      </div>

      <Fab label="Añadir falta" onClick={() => ui.openSheet({ kind: 'absence', subjectId: s.id })} />
    </motion.div>
  )
}

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className="card px-3 py-3.5 text-center">
      <b className="block text-2xl leading-none font-extrabold tabular-nums">{value}</b>
      <span className="mt-1.5 block text-xs font-semibold text-muted">{label}</span>
    </div>
  )
}
