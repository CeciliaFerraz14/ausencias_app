import { CalendarCheck, ChevronRight, Download, FileJson, Mail, ScanLine, Smartphone, Sparkles } from 'lucide-react'
import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Ring } from './Ring'

const TUTORIAL_KEY = 'ausencias:tutorial'

export function tutorialPending() {
  try {
    return localStorage.getItem(TUTORIAL_KEY) !== 'done'
  } catch {
    return false
  }
}

function markDone() {
  try {
    localStorage.setItem(TUTORIAL_KEY, 'done')
  } catch {
    /* sin almacenamiento: se volverá a mostrar */
  }
}

type Slide = { title: string; text: ReactNode; art: () => ReactNode }

const SLIDES: Slide[] = [
  {
    title: 'Controla tus faltas',
    text: 'Sabrás en todo momento cuántas horas puedes faltar a cada módulo sin perder la evaluación continua.',
    art: WelcomeArt,
  },
  {
    title: 'Escanea tu horario',
    text: 'Haz una foto a tu horario y la app crea tus módulos con sus horas. Revisa la duración de cada uno y listo.',
    art: ScanArt,
  },
  {
    title: 'Anota en un toque',
    text: (
      <>
        Pulsa <b>+1</b> en un módulo o <b>Falté</b> en las clases de hoy. Si faltas todo el día, hay un botón para anotarlo de una vez.
      </>
    ),
    art: TapArt,
  },
  {
    title: 'El límite del 15 %',
    text: 'Si tus faltas llegan al 15 % de las horas de un módulo, pierdes la evaluación continua. La app te avisa antes de llegar.',
    art: LimitArt,
  },
  {
    title: 'La carta de los 5 días',
    text: '5 días lectivos seguidos sin venir, o 10 en un periodo de 30, y el centro te pide que te incorpores. También lo vigilamos.',
    art: LetterArt,
  },
  {
    title: 'Tus datos, en tu móvil',
    text: (
      <>
        No hay cuentas: todo se guarda <b>solo en este dispositivo</b>. Si borras los datos del navegador o cambias de móvil, se pierden. Haz una copia
        de vez en cuando en <b>Ajustes → Exportar datos</b>.
      </>
    ),
    art: DataArt,
  },
]

export function Onboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [[index, direction], setPage] = useState<[number, number]>([0, 0])
  const last = index === SLIDES.length - 1

  useEffect(() => {
    if (open) setPage([0, 0])
  }, [open])

  function go(next: number) {
    if (next < 0 || next >= SLIDES.length) return
    setPage([next, next > index ? 1 : -1])
  }

  function finish() {
    markDone()
    onClose()
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -60 || info.velocity.x < -400) go(index + 1)
    else if (info.offset.x > 60 || info.velocity.x > 400) go(index - 1)
  }

  const slide = SLIDES[index]
  const Art = slide.art

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.35 }}
          role="dialog"
          aria-modal="true"
          aria-label="Tutorial"
        >
          {/* Brillos de fondo que se mueven despacio */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -left-24 size-[26rem] rounded-full bg-violet-600/40 blur-3xl"
            animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 bottom-10 size-[24rem] rounded-full bg-fuchsia-600/30 blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+20px)]">
            <div className="flex justify-end">
              {!last && (
                <button type="button" onClick={finish} className="rounded-full px-3 py-1.5 text-sm font-bold text-muted transition hover:text-fg">
                  Saltar
                </button>
              )}
            </div>

            <AnimatePresence mode="popLayout" custom={direction} initial={false}>
              <motion.div
                key={index}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ x: d >= 0 ? 80 : -80, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({ x: d >= 0 ? -80 : 80, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={onDragEnd}
                className="flex flex-1 cursor-grab flex-col justify-center active:cursor-grabbing"
              >
                <div className="grid h-72 place-items-center">
                  <Art />
                </div>
                <motion.h2
                  className="mt-8 text-center text-[2rem] leading-tight font-extrabold tracking-tight"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                >
                  {slide.title}
                </motion.h2>
                <motion.p
                  className="mx-auto mt-3 max-w-sm text-center text-[16px] leading-relaxed text-muted [&_b]:text-fg"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {slide.text}
                </motion.p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="Pasos del tutorial">
              {SLIDES.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Paso ${i + 1}`}
                  onClick={() => go(i)}
                  className="h-2.5 rounded-full p-0"
                >
                  <motion.span
                    className="block h-2.5 rounded-full"
                    animate={{ width: i === index ? 28 : 10, backgroundColor: i === index ? '#d946ef' : 'rgba(255,255,255,0.2)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                </button>
              ))}
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => (last ? finish() : go(index + 1))}
              className="btn-primary mt-6 min-h-14 w-full text-[17px]"
            >
              {last ? (
                <>
                  <Sparkles size={19} /> Empezar
                </>
              ) : (
                <>
                  Siguiente <ChevronRight size={19} strokeWidth={2.5} />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ---------- Ilustraciones animadas ---------- */

function WelcomeArt() {
  const [n, setN] = useState(19)
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x <= 14 ? 19 : x - 1)), 900)
    return () => clearInterval(t)
  }, [])
  const fraction = (19 - n) / 19 + 0.18
  return (
    <motion.div initial={{ scale: 0.6, rotate: -10, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', damping: 14 }}>
      <div className="brand-gradient relative grid size-60 place-items-center rounded-[3rem] shadow-2xl shadow-fuchsia-600/40">
        <div className="absolute inset-0 rounded-[3rem] bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.3),transparent_60%)]" />
        <Ring size={170} stroke={14} fraction={fraction} color="#ffffff" track="rgba(255,255,255,0.22)">
          <div className="text-white">
            <motion.b key={n} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="block text-6xl leading-none font-extrabold tabular-nums">
              {n}
            </motion.b>
            <span className="text-sm font-bold text-white/85">faltas te quedan</span>
          </div>
        </Ring>
      </div>
    </motion.div>
  )
}

function ScanArt() {
  const cells = [
    [0, 0, '#7c3aed'], [0, 1, '#7c3aed'], [1, 0, '#ea580c'], [2, 1, '#059669'], [2, 2, '#059669'], [3, 0, '#7c3aed'], [1, 2, '#2563eb'], [4, 1, '#ea580c'], [3, 2, '#2563eb'],
  ] as const
  const chips = [
    { label: 'Programación', color: '#7c3aed', x: -70, y: -118 },
    { label: 'Bases de Datos', color: '#ea580c', x: 74, y: -96 },
    { label: 'FOL', color: '#2563eb', x: 96, y: 112 },
  ]
  return (
    <div className="relative">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative grid w-64 grid-cols-5 gap-1.5 overflow-hidden rounded-3xl bg-card p-3 ring-1 ring-line"
      >
        {Array.from({ length: 15 }, (_, i) => {
          const col = i % 5
          const row = Math.floor(i / 5)
          const cell = cells.find(([c, r]) => c === col && r === row)
          return (
            <motion.span
              key={i}
              className="h-14 rounded-lg"
              initial={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              animate={{ backgroundColor: cell ? cell[2] : 'rgba(255,255,255,0.05)' }}
              transition={{ delay: 0.3 + i * 0.05 }}
            />
          )
        })}
        <motion.div
          className="absolute inset-x-0 h-16 bg-linear-to-b from-transparent via-fuchsia-400/60 to-transparent"
          animate={{ top: ['-25%', '100%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
      <div className="brand-gradient absolute -bottom-5 left-1/2 grid size-12 -translate-x-1/2 place-items-center rounded-2xl text-white shadow-lg shadow-fuchsia-600/40">
        <ScanLine size={22} />
      </div>
      {chips.map((c, i) => (
        <motion.span
          key={c.label}
          className="absolute top-1/2 left-1/2 rounded-full px-3 py-1.5 text-xs font-extrabold whitespace-nowrap text-white shadow-lg"
          style={{ background: c.color }}
          initial={{ x: '-50%', y: '-50%', opacity: 0, scale: 0.4 }}
          animate={{ x: `calc(-50% + ${c.x}px)`, y: `calc(-50% + ${c.y}px)`, opacity: 1, scale: 1 }}
          transition={{ delay: 1.1 + i * 0.25, type: 'spring', damping: 12 }}
        >
          {c.label}
        </motion.span>
      ))}
    </div>
  )
}

function TapArt() {
  const [n, setN] = useState(8)
  const [marked, setMarked] = useState(false)
  useEffect(() => {
    const t = setInterval(() => {
      setN((x) => (x <= 5 ? 8 : x - 1))
      setMarked((m) => !m)
    }, 1200)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="grid w-72 gap-3">
      <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="card flex items-center gap-3 p-3.5">
        <Ring size={56} stroke={6} fraction={(8 - n) / 10 + 0.2} color="#10b981" track="var(--soft)">
          <motion.span key={n} initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="text-lg font-extrabold text-emerald-400">
            {n}
          </motion.span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">Programación</p>
          <p className="text-xs text-muted">Te quedan {n} faltas</p>
        </div>
        <motion.span
          key={`b${n}`}
          className="subject-gradient grid size-12 place-items-center rounded-2xl font-extrabold text-white"
          style={{ ['--c' as string]: '#7c3aed' }}
          initial={{ scale: 0.8 }}
          animate={{ scale: [0.8, 1.12, 1] }}
          transition={{ duration: 0.4 }}
        >
          +1
        </motion.span>
      </motion.div>
      <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="card flex items-center gap-3 p-3.5">
        <div className="w-11 text-center">
          <p className="text-sm font-extrabold">10:15</p>
          <p className="text-[11px] text-muted">12:05</p>
        </div>
        <span className="h-9 w-1.5 rounded-full bg-orange-600" />
        <p className="flex-1 font-bold">Bases de Datos</p>
        <motion.span
          animate={{ backgroundColor: marked ? '#ea580c' : 'rgba(255,255,255,0.08)' }}
          className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-sm font-bold text-white"
        >
          {marked ? (
            <>
              <CalendarCheck size={15} /> Anotada
            </>
          ) : (
            'Falté'
          )}
        </motion.span>
      </motion.div>
    </div>
  )
}

function LimitArt() {
  return (
    <div className="w-72">
      <div className="card p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-extrabold">Bases de Datos</span>
          <span className="text-sm font-bold text-muted">160 h</span>
        </div>
        <div className="relative mt-5 h-5 overflow-visible rounded-full bg-soft">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: '0%', backgroundColor: '#10b981' }}
            animate={{ width: ['0%', '68%', '92%', '100%'], backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#f43f5e'] }}
            transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' }}
          />
          <div className="absolute -top-2 right-0 h-9 w-0.5 rounded bg-white/80" />
        </div>
        <div className="mt-3 flex justify-between text-xs font-bold text-muted">
          <span>0 h</span>
          <span className="text-rose-400">15 % = 24 h</span>
        </div>
      </div>
      <motion.p
        className="mt-4 rounded-2xl bg-rose-500/12 px-4 py-3 text-center text-sm font-bold text-rose-300"
        animate={{ opacity: [0, 0, 1, 1, 0] }}
        transition={{ duration: 4, repeat: Infinity, times: [0, 0.6, 0.7, 0.95, 1] }}
      >
        Al llegar al 15 % pierdes la evaluación continua
      </motion.p>
    </div>
  )
}

function LetterArt() {
  const days = ['L', 'M', 'X', 'J', 'V']
  return (
    <div className="grid justify-items-center gap-6">
      <div className="flex gap-2.5">
        {days.map((d, i) => (
          <motion.span
            key={d}
            className="grid size-12 place-items-center rounded-2xl text-lg font-extrabold"
            initial={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a19cbd' }}
            animate={{ backgroundColor: ['rgba(255,255,255,0.06)', '#f43f5e', '#f43f5e', 'rgba(255,255,255,0.06)'], color: ['#a19cbd', '#fff', '#fff', '#a19cbd'] }}
            transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.08 + i * 0.1, 0.9, 1], delay: 0 }}
          >
            {d}
          </motion.span>
        ))}
      </div>
      <motion.div
        className="brand-gradient grid size-24 place-items-center rounded-[1.75rem] text-white shadow-2xl shadow-fuchsia-600/40"
        animate={{ scale: [0, 0, 1.15, 1, 1, 0], rotate: [0, 0, -8, 0, 0, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.55, 0.65, 0.72, 0.9, 1] }}
      >
        <Mail size={44} strokeWidth={2} />
      </motion.div>
    </div>
  )
}

function DataArt() {
  return (
    <div className="relative flex items-center gap-10">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative grid h-56 w-32 place-items-center rounded-[2rem] bg-card ring-2 ring-white/15"
      >
        <span className="absolute top-2.5 h-1.5 w-10 rounded-full bg-white/15" />
        <motion.div
          className="brand-gradient grid size-16 place-items-center rounded-2xl text-white shadow-lg shadow-fuchsia-600/40"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Smartphone size={30} />
        </motion.div>
        <span className="absolute bottom-6 text-[11px] font-bold tracking-wide text-muted uppercase">Tus faltas</span>
      </motion.div>

      <motion.div
        className="absolute top-1/2 left-24 grid size-14 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/40"
        animate={{ x: [0, 0, 112, 112], y: ['-50%', '-50%', '-50%', '-50%'], opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.8] }}
        transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 0.6, times: [0, 0.2, 0.75, 1] }}
      >
        <FileJson size={26} />
      </motion.div>

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', damping: 14 }}
        className="grid justify-items-center gap-2"
      >
        <div className="grid size-24 place-items-center rounded-3xl bg-soft text-emerald-400 ring-1 ring-line">
          <Download size={40} />
        </div>
        <span className="rounded-full bg-soft px-3 py-1 text-xs font-bold text-muted ring-1 ring-line">ausencias.json</span>
      </motion.div>
    </div>
  )
}
