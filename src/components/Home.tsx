import { Briefcase, CalendarX2, Camera, Check, Info, ListChecks, PartyPopper, ScanLine, Settings, Sparkles, SquarePen } from 'lucide-react'
import { motion } from 'motion/react'
import type { CSSProperties } from 'react'
import { addAbsenceWithUndo } from '../lib/absences'
import {
  attendance,
  blockHours,
  formatLongDate,
  formatShortDate,
  internshipOn,
  plural,
  remainingText,
  slotKey,
  stats,
  STATUS_META,
  statusLabel,
  STREAK_LIMIT,
  todayISO,
  weekdayOf,
  weeksLeft,
  WINDOW_DAYS,
  vibrate,
  WINDOW_LIMIT,
} from '../lib/logic'
import { openSubject } from '../lib/route'
import { actions } from '../lib/store'
import type { AppState, Stats, Subject } from '../lib/types'
import { useUI } from '../lib/ui'
import { Fab, IconButton, SectionTitle } from './common'
import { InstallBanner } from './PwaPrompts'
import { Ring } from './Ring'

type Item = { s: Subject; st: Stats }

export function Home({ state }: { state: AppState }) {
  const ui = useUI()
  const now = new Date()
  const items: Item[] = state.subjects.map((s) => ({ s, st: stats(s, state.settings.justifiedCount) }))

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-2xl px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-36"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted">{formatLongDate(now)}</p>
          <h1 className="mt-0.5 text-[2rem] leading-tight font-extrabold tracking-tight">Mis ausencias</h1>
        </div>
        <div className="flex gap-2 pt-1">
          <IconButton label="Escanear horario" onClick={() => ui.openSheet({ kind: 'import' })}>
            <ScanLine size={20} strokeWidth={2.25} />
          </IconButton>
          <IconButton label="Ajustes" onClick={() => ui.openSheet({ kind: 'settings' })}>
            <Settings size={20} strokeWidth={2.25} />
          </IconButton>
        </div>
      </header>

      <InstallBanner />

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <SummaryCard items={items} state={state} />
          <TodaySection state={state} now={now} />
          <AttendanceCard state={state} now={now} />
          <section className="mt-8">
            <SectionTitle aside={plural(items.length, 'módulo')}>Módulos</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item, i) => (
                <SubjectCard key={item.s.id} item={item} index={i} />
              ))}
            </div>
          </section>
          <Fab label="Añadir" onClick={() => ui.openSheet({ kind: 'add-menu' })} />
        </>
      )}
    </motion.main>
  )
}

/* ---------- Resumen ---------- */

function SummaryCard({ items, state }: { items: Item[]; state: AppState }) {
  const worst = [...items].sort((a, b) => a.st.remaining / Math.max(1, a.st.allowed) - b.st.remaining / Math.max(1, b.st.allowed))[0]
  const { s, st } = worst
  const totalUsed = items.reduce((n, x) => n + x.st.used, 0)
  const atRisk = items.filter((x) => x.st.status === 'danger' || x.st.status === 'over').length
  const sem = state.settings.semester
  const weeks = sem && todayISO() <= sem.end ? weeksLeft(sem.end) : null

  let title: string
  let subtitle: string
  if (st.status === 'over') {
    title = `Has perdido la evaluación continua en ${s.name}`
    subtitle = 'Has llegado al límite de faltas del módulo. Habla con tu tutor/a.'
  } else if (st.status === 'danger') {
    title = st.remaining === 0 ? `No puedes faltar más a ${s.name}` : `Cuidado con ${s.name}`
    subtitle =
      st.remaining === 0
        ? 'Una falta más y pierdes la evaluación continua.'
        : `Solo te ${st.remaining === 1 ? 'queda 1 falta' : `quedan ${st.remaining} faltas`} antes de perder la evaluación continua.`
  } else if (st.status === 'warn') {
    title = `Ojo con ${s.name}`
    subtitle = 'Ya has gastado más de la mitad de tus faltas.'
  } else {
    title = 'Todo bajo control'
    subtitle = 'Vas bien en todos tus módulos.'
  }
  const alert = st.status !== 'ok'

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 220 }}
      className="brand-gradient relative mt-6 overflow-hidden rounded-[2rem] p-5 text-white shadow-xl shadow-fuchsia-600/20"
    >
      <div className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-white/15 blur-sm" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 size-44 rounded-full bg-orange-300/25 blur-2xl" />

      <button
        type="button"
        disabled={!alert}
        onClick={() => openSubject(s.id)}
        className="relative block w-full text-left disabled:cursor-default"
      >
        <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase">
          <Sparkles size={13} strokeWidth={2.5} />
          {alert ? 'Atención' : 'Resumen'}
        </span>
        <h2 className="mt-3 text-2xl leading-tight font-extrabold tracking-tight text-balance">{title}</h2>
        <p className="mt-1 text-[15px] text-white/85">{subtitle}</p>
      </button>

      <div className="relative mt-5 grid grid-cols-3 gap-2">
        <Stat value={items.length} label={items.length === 1 ? 'módulo' : 'módulos'} />
        <Stat value={totalUsed} label={totalUsed === 1 ? 'falta' : 'faltas'} />
        {weeks != null ? (
          <Stat value={weeks} label={weeks === 1 ? 'semana más' : 'semanas más'} />
        ) : (
          <Stat value={atRisk} label="en riesgo" />
        )}
      </div>
    </motion.section>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="glass rounded-2xl px-3 py-2.5">
      <b className="block text-2xl leading-none font-extrabold tabular-nums">{value}</b>
      <span className="mt-1 block text-xs font-semibold text-white/80">{label}</span>
    </div>
  )
}

/* ---------- Hoy ---------- */

function TodaySection({ state, now }: { state: AppState; now: Date }) {
  const ui = useUI()
  if (!state.subjects.some((s) => s.schedule.length)) return null

  const today = todayISO()
  const internship = internshipOn(today, state.settings.semester)
  if (internship)
    return (
      <section className="mt-8">
        <SectionTitle>Hoy</SectionTitle>
        <div className="card flex items-center gap-4 p-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-500/12 text-sky-600 dark:text-sky-400">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="font-bold">Estás de prácticas</p>
            <p className="text-sm text-muted">Hasta el {formatShortDate(internship.end)}. Estos días no cuentan como faltas escolares.</p>
          </div>
        </div>
      </section>
    )

  const wd = weekdayOf(now)
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const sessions = state.subjects
    .flatMap((s) =>
      s.schedule
        .filter((x) => x.weekday === wd)
        .map((x) => ({ s, x, absence: s.absences.find((a) => a.date === today && a.slot === slotKey(x)) })),
    )
    .sort((a, b) => a.x.start.localeCompare(b.x.start))

  const pending = sessions.filter((x) => !x.absence)

  function missWholeDay() {
    const added = pending.map(({ s, x }) => ({
      subjectId: s.id,
      id: actions.addAbsence(s.id, { date: today, amount: blockHours(x), justified: false, note: '', slot: slotKey(x) }),
    }))
    vibrate()
    const hours = pending.reduce((n, p) => n + blockHours(p.x), 0)
    ui.toast(`Día completo anotado (${plural(hours, 'hora')})`, {
      label: 'Deshacer',
      run: () => added.forEach((a) => actions.removeAbsence(a.subjectId, a.id)),
    })
  }

  return (
    <section className="mt-8">
      <SectionTitle
        aside={
          pending.length > 1 ? (
            <button type="button" onClick={missWholeDay} className="font-bold text-violet-600 dark:text-violet-300">
              Falté todo el día
            </button>
          ) : sessions.length ? (
            plural(sessions.length, 'clase')
          ) : undefined
        }
      >
        Hoy
      </SectionTitle>
      {sessions.length === 0 ? (
        <div className="card flex items-center gap-4 p-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
            <PartyPopper size={24} />
          </div>
          <div>
            <p className="font-bold">Hoy no tienes clase</p>
            <p className="text-sm text-muted">Disfruta del día libre.</p>
          </div>
        </div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {sessions.map(({ s, x, absence }) => {
            const live = x.start <= hhmm && hhmm < x.end
            const past = hhmm >= x.end
            return (
              <div key={s.id + slotKey(x)} className="flex items-center gap-3 px-4 py-3" style={{ '--c': s.color } as CSSProperties}>
                <div className="w-12 shrink-0 text-center tabular-nums">
                  <p className="text-sm font-extrabold">{x.start}</p>
                  <p className="text-xs font-medium text-muted">{x.end}</p>
                </div>
                <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <button type="button" onClick={() => openSubject(s.id)} className="min-w-0 flex-1 text-left">
                  <p className={`truncate font-bold ${past && !absence ? 'text-muted' : ''}`}>{s.name}</p>
                  {!live && <p className="text-xs font-medium text-muted">{plural(blockHours(x), 'hora')}</p>}
                  {live && (
                    <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                      </span>
                      Ahora
                    </span>
                  )}
                </button>
                {absence ? (
                  <motion.button
                    type="button"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    onClick={() => {
                      actions.removeAbsence(s.id, absence.id)
                      ui.toast(`Falta de ${s.name} quitada`, { label: 'Deshacer', run: () => actions.restoreAbsence(s.id, absence) })
                    }}
                    className="subject-gradient inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-white shadow-sm"
                  >
                    <Check size={16} strokeWidth={3} /> Anotada
                  </motion.button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      addAbsenceWithUndo(ui, s.id, { date: today, amount: blockHours(x), justified: false, note: '', slot: slotKey(x) })
                    }
                    className="h-10 rounded-xl bg-soft px-3.5 text-sm font-bold text-fg ring-1 ring-line transition active:scale-95"
                  >
                    Falté
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* ---------- Art. 18: asistencia al centro ---------- */

function AttendanceCard({ state, now }: { state: AppState; now: Date }) {
  const ui = useUI()
  const att = attendance(state, now)
  if (!att) return null

  const message = {
    ok: 'Cuentan los días en que faltas a todas las clases del horario.',
    warn: 'Llevas varios días completos sin venir. Ojo con el límite.',
    danger: 'Estás cerca del límite de días completos sin asistir.',
    over: 'Has llegado al límite: el centro te pedirá por escrito que te incorpores y, si no, puede anular tu matrícula.',
  }[att.level]

  return (
    <section className="mt-8">
      <SectionTitle
        aside={
          <button type="button" onClick={() => ui.openSheet({ kind: 'rules' })} className="inline-flex items-center gap-1 font-bold text-violet-600 dark:text-violet-300">
            <Info size={15} strokeWidth={2.5} /> Normativa
          </button>
        }
      >
        Asistencia al centro
      </SectionTitle>
      <div className="card grid gap-4 p-4">
        <Meter label="Días seguidos sin venir" value={att.streak} max={STREAK_LIMIT} />
        <Meter label={`Días sin venir (últimos ${WINDOW_DAYS} lectivos)`} value={att.inWindow} max={WINDOW_LIMIT} />
        <p className="flex gap-2.5 text-sm text-muted">
          <CalendarX2 size={18} className="mt-0.5 shrink-0" style={{ color: STATUS_META[att.level].color }} />
          {message}
        </p>
      </div>
    </section>
  )
}

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const color = value >= max ? STATUS_META.over.color : value >= max * 0.6 ? STATUS_META.danger.color : value > 0 ? STATUS_META.warn.color : STATUS_META.ok.color
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-sm font-extrabold tabular-nums" style={{ color }}>
          {value}
          <span className="font-semibold text-muted"> / {max}</span>
        </span>
      </div>
      <div className="flex gap-1" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
        {Array.from({ length: max }, (_, i) => (
          <motion.span
            key={i}
            className="h-2.5 flex-1 rounded-full"
            initial={false}
            animate={{ backgroundColor: i < value ? color : 'var(--soft)' }}
            transition={{ delay: i * 0.03 }}
          />
        ))}
      </div>
    </div>
  )
}

/* ---------- Tarjeta de módulo ---------- */

function SubjectCard({ item: { s, st }, index }: { item: Item; index: number }) {
  const ui = useUI()
  const color = STATUS_META[st.status].color
  const fraction = st.allowed > 0 ? st.used / st.allowed : st.used > 0 ? 1 : 0

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, type: 'spring', damping: 24, stiffness: 260 }}
      whileTap={{ scale: 0.985 }}
      className="card relative overflow-hidden p-4"
      style={{ '--c': s.color } as CSSProperties}
    >
      <div className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full opacity-20 blur-2xl" style={{ background: s.color }} />
      <button type="button" className="absolute inset-0" onClick={() => openSubject(s.id)} aria-label={`Ver ${s.name}`} />

      <div className="pointer-events-none relative flex items-center gap-4">
        <Ring size={66} stroke={7} fraction={fraction} color={color} track="var(--soft)">
          <span className="text-xl font-extrabold tabular-nums" style={{ color }}>
            {st.remaining}
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-extrabold tracking-tight">{s.name}</h3>
          <p className="mt-0.5 text-sm leading-snug text-muted">{remainingText(st)}</p>
          <span
            className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
          >
            {statusLabel(st)}
          </span>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.85, rotate: -6 }}
          onClick={() => addAbsenceWithUndo(ui, s.id, { date: todayISO(), amount: 1, justified: false, note: '' })}
          className="subject-gradient pointer-events-auto relative grid size-13 shrink-0 place-items-center rounded-2xl text-lg font-extrabold text-white shadow-lg shadow-black/10"
          aria-label={`Anotar una hora de falta hoy en ${s.name}`}
        >
          +1
        </motion.button>
      </div>
    </motion.article>
  )
}

/* ---------- Estado vacío ---------- */

function EmptyState() {
  const ui = useUI()
  const steps = [
    { icon: Camera, title: 'Haz una foto a tu horario', text: 'La app detecta tus módulos y sus horas semanales.' },
    { icon: ListChecks, title: 'Revisa y ajusta', text: 'Comprueba las fechas del curso y la duración de cada módulo.' },
    { icon: SquarePen, title: 'Anota cada falta', text: 'Sabrás cuántas te quedan antes del 15 %.' },
  ]
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
      <div className="brand-gradient relative overflow-hidden rounded-[2rem] px-6 pt-8 pb-6 text-white shadow-xl shadow-fuchsia-600/20">
        <div className="pointer-events-none absolute -top-14 -right-10 size-44 rounded-full bg-white/15" />
        <div className="pointer-events-none absolute top-24 -left-16 size-40 rounded-full bg-orange-300/30 blur-2xl" />
        <motion.div
          className="glass relative grid size-16 place-items-center rounded-3xl"
          animate={{ rotate: [0, -6, 6, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        >
          <ScanLine size={30} strokeWidth={2.25} />
        </motion.div>
        <h2 className="relative mt-5 text-[1.7rem] leading-tight font-extrabold tracking-tight">Empieza escaneando tu horario</h2>
        <p className="relative mt-2 text-white/85">
          En un minuto tendrás todos tus módulos con las faltas que puedes tener antes de perder la evaluación continua.
        </p>
        <div className="relative mt-6 grid gap-2">
          <button
            type="button"
            onClick={() => ui.openSheet({ kind: 'import' })}
            className="btn bg-white text-violet-700 shadow-lg shadow-black/10"
          >
            <Camera size={20} strokeWidth={2.5} /> Escanear horario
          </button>
          <button type="button" onClick={() => ui.openSheet({ kind: 'subject' })} className="btn glass text-white">
            Añadir módulo a mano
          </button>
        </div>
      </div>

      <ol className="mt-6 grid gap-3">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <motion.li
            key={title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="card flex items-center gap-4 p-4"
          >
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-500/12 text-violet-600 dark:text-violet-300">
              <Icon size={22} strokeWidth={2.25} />
            </div>
            <div>
              <p className="font-bold">{title}</p>
              <p className="text-sm text-muted">{text}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </motion.section>
  )
}
