import { CalendarCheck, ChevronRight, Compass, Download, EllipsisVertical, FileJson, Mail, MonitorDown, ScanLine, Share, Smartphone, Sparkles, SquarePlus } from 'lucide-react'
import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { isIOS, isStandalone, useInstall } from '../lib/pwa'
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

/** withInstall: la primera vez, antes del tutorial, explica cómo instalar la app (si no está ya instalada). */
export function Onboarding({ open, onClose, withInstall }: { open: boolean; onClose: () => void; withInstall: boolean }) {
  const [[index, direction], setPage] = useState<[number, number]>([0, 0])
  const [phase, setPhase] = useState<'install' | 'slides'>(() => (withInstall && !isStandalone() ? 'install' : 'slides'))
  const last = index === SLIDES.length - 1

  useEffect(() => {
    if (!open) return
    setPage([0, 0])
    setPhase(withInstall && !isStandalone() ? 'install' : 'slides')
  }, [open, withInstall])

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

          <AnimatePresence mode="wait" initial={false}>
          {phase === 'install' ? (
            <InstallStep key="install" onContinue={() => setPhase('slides')} />
          ) : (
          <motion.div
            key="slides"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+20px)]"
          >
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
          </motion.div>
          )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ---------- Pantalla previa: cómo instalar la app ---------- */

type Platform = 'ios' | 'android' | 'desktop'

const INSTALL_STEPS: Record<Platform, { icon: typeof Share; text: ReactNode }[]> = {
  ios: [
    { icon: Compass, text: <>Abre esta página en <b>Safari</b>.</> },
    { icon: Share, text: <>Toca el botón <b>Compartir</b> de la barra de abajo.</> },
    { icon: SquarePlus, text: <>Elige <b>Añadir a pantalla de inicio</b> y pulsa <b>Añadir</b>.</> },
  ],
  android: [
    { icon: EllipsisVertical, text: <>En Chrome, abre el menú <b>⋮</b> de arriba a la derecha.</> },
    { icon: Download, text: <>Toca <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.</> },
  ],
  desktop: [
    { icon: MonitorDown, text: <>Pulsa el icono de <b>instalar</b> en la barra de direcciones.</> },
    { icon: EllipsisVertical, text: <>O abre el menú <b>⋮</b> y elige <b>Instalar Ausencias</b>.</> },
  ],
}

function InstallStep({ onContinue }: { onContinue: () => void }) {
  const install = useInstall()
  const [platform, setPlatform] = useState<Platform>(() => (isIOS() ? 'ios' : /android/i.test(navigator.userAgent) ? 'android' : 'desktop'))
  const tabs: { value: Platform; label: string }[] = [
    { value: 'ios', label: 'iPhone' },
    { value: 'android', label: 'Android' },
    { value: 'desktop', label: 'Ordenador' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}
      className="relative mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-6 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+20px)]"
    >
      <div className="flex flex-1 flex-col justify-center">
        <PhoneArt />
        <h2 className="mt-7 text-center text-[2rem] leading-tight font-extrabold tracking-tight">Instálala en tu móvil</h2>
        <p className="mx-auto mt-2 max-w-sm text-center text-[16px] leading-relaxed text-muted">
          La tendrás en tu pantalla de inicio, a pantalla completa y funcionando sin conexión, como una app más.
        </p>

        {install.canPrompt ? (
          <p className="mx-auto mt-6 rounded-2xl bg-emerald-500/12 px-4 py-3 text-center text-sm font-semibold text-emerald-300">
            Tu navegador permite instalarla con un solo toque.
          </p>
        ) : (
          <div className="mt-6">
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-soft p-1" role="tablist" aria-label="Tu dispositivo">
              {tabs.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={platform === t.value}
                  onClick={() => setPlatform(t.value)}
                  className={`relative rounded-xl py-2 text-sm font-bold transition-colors ${platform === t.value ? 'text-fg' : 'text-muted'}`}
                >
                  {platform === t.value && (
                    <motion.span layoutId="install-tab" className="absolute inset-0 rounded-xl bg-card ring-1 ring-line" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                  )}
                  <span className="relative">{t.label}</span>
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.ol
                key={platform}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="mt-3 grid gap-2"
              >
                {INSTALL_STEPS[platform].map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-2xl bg-soft px-3.5 py-3 text-[15px] [&_b]:text-fg">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-violet-300 ring-1 ring-line">
                      <Icon size={19} />
                    </span>
                    <span className="text-muted">
                      <b className="mr-1 text-fg">{i + 1}.</b>
                      {text}
                    </span>
                  </li>
                ))}
              </motion.ol>
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-2">
        {install.canPrompt ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={async () => {
              await install.prompt()
              onContinue()
            }}
            className="btn-primary min-h-14 w-full text-[17px]"
          >
            <Download size={19} /> Instalar ahora
          </motion.button>
        ) : (
          <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onContinue} className="btn-primary min-h-14 w-full text-[17px]">
            Ver el tutorial <ChevronRight size={19} strokeWidth={2.5} />
          </motion.button>
        )}
        <button type="button" onClick={onContinue} className="btn-ghost w-full text-sm">
          Ahora no, seguir en el navegador
        </button>
      </div>
    </motion.div>
  )
}

function PhoneArt() {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative mx-auto h-52 w-36 rounded-[2rem] bg-card p-3 pt-7 ring-2 ring-white/15"
    >
      <span className="absolute top-2.5 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-white/15" />
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="aspect-square rounded-xl bg-white/[0.07]" />
        ))}
        <motion.img
          src="/icon-192.png"
          alt=""
          className="aspect-square w-full rounded-xl shadow-lg shadow-fuchsia-600/50"
          initial={{ y: -90, scale: 1.6, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', damping: 11, stiffness: 160 }}
        />
      </div>
      <motion.span
        className="absolute -right-3 -bottom-3 grid size-11 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.1, type: 'spring', damping: 12 }}
      >
        <Smartphone size={20} />
      </motion.span>
    </motion.div>
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
