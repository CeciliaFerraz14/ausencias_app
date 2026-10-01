import { ChevronRight, ScanLine, SquarePen } from 'lucide-react'
import { useUI } from '../../lib/ui'
import { Sheet } from '../Sheet'

export function AddMenuSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ui = useUI()
  const options = [
    {
      icon: ScanLine,
      title: 'Escanear horario',
      text: 'Crea o actualiza tus módulos con una foto.',
      action: () => ui.openSheet({ kind: 'import' }),
      accent: 'brand-gradient text-white',
    },
    {
      icon: SquarePen,
      title: 'Añadir módulo',
      text: 'Créala a mano con su límite de faltas.',
      action: () => ui.openSheet({ kind: 'subject' }),
      accent: 'bg-violet-500/12 text-violet-600 dark:text-violet-300',
    },
  ]
  return (
    <Sheet open={open} onClose={onClose} title="Añadir">
      <div className="grid gap-3 pt-1 pb-2">
        {options.map(({ icon: Icon, title, text, action, accent }) => (
          <button key={title} type="button" onClick={action} className="flex items-center gap-4 rounded-3xl bg-soft p-4 text-left ring-1 ring-line transition active:scale-[0.98]">
            <span className={`grid size-13 shrink-0 place-items-center rounded-2xl ${accent}`}>
              <Icon size={24} strokeWidth={2.25} />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[17px]">{title}</b>
              <span className="text-sm text-muted">{text}</span>
            </span>
            <ChevronRight className="text-muted" size={20} />
          </button>
        ))}
      </div>
    </Sheet>
  )
}
