import { Share, SquarePlus } from 'lucide-react'
import { Sheet } from '../Sheet'

export function InstallIosSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const steps = [
    { icon: Share, text: <>Toca el botón <b>Compartir</b> en la barra de Safari.</> },
    { icon: SquarePlus, text: <>Elige <b>Añadir a pantalla de inicio</b>.</> },
  ]
  return (
    <Sheet open={open} onClose={onClose} title="Instalar en iPhone">
      <div className="grid gap-3 pt-1 pb-3">
        {steps.map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-center gap-4 rounded-3xl bg-soft p-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-card text-violet-600 ring-1 ring-line dark:text-violet-300">
              <Icon size={22} />
            </span>
            <p className="text-[15px]">
              <span className="font-bold text-muted">{i + 1}. </span>
              {text}
            </p>
          </div>
        ))}
        <p className="px-1 text-sm text-muted">La app aparecerá en tu pantalla de inicio y funcionará también sin conexión.</p>
      </div>
    </Sheet>
  )
}
