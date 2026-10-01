import { CalendarX2, Percent, Scale } from 'lucide-react'
import type { ReactNode } from 'react'
import { Sheet } from '../Sheet'

function Article({ icon, title, tag, children }: { icon: ReactNode; title: string; tag: string; children: ReactNode }) {
  return (
    <article className="rounded-3xl bg-soft p-4">
      <div className="flex items-center gap-3">
        <span className="brand-gradient grid size-11 shrink-0 place-items-center rounded-2xl text-white">{icon}</span>
        <div>
          <p className="text-xs font-bold tracking-wider text-muted uppercase">{tag}</p>
          <h3 className="text-[17px] leading-tight font-extrabold">{title}</h3>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-[15px] leading-relaxed">{children}</div>
    </article>
  )
}

export function RulesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Normativa">
      <div className="grid gap-4 pt-1 pb-2">
        <Article icon={<Percent size={20} strokeWidth={2.5} />} tag="Artículo 19" title="El 15 % de faltas">
          <p>
            Si tus faltas llegan al <b>15 % de la duración total del módulo</b>, pierdes el derecho a la <b>evaluación continua</b> en ese módulo. La app
            usa ese 15 %; si tu centro fija uno menor en su Proyecto Curricular, ten en cuenta que tendrás menos margen.
          </p>
          <p>
            Se cuenta desde la fecha en que te matriculaste. En la app, cada falta es una hora lectiva y el límite que ves es el número máximo de horas
            que puedes faltar sin llegar al porcentaje.
          </p>
          <p className="text-muted">
            Puede quedar excluido de este límite el alumnado que concilia los estudios con un trabajo y los deportistas de alto nivel o alto rendimiento,
            si lo acreditan y lo aprueba el equipo docente a petición propia.
          </p>
        </Article>

        <Article icon={<CalendarX2 size={20} strokeWidth={2.5} />} tag="Artículo 18" title="La carta de los 5 días">
          <p>
            Si no asistes durante <b>5 días lectivos seguidos</b>, o <b>10 días en un periodo de 30</b>, el centro te pedirá por escrito que te
            incorpores. Si no lo haces, se anulará tu matrícula, salvo causa justificada que acepte la Dirección.
          </p>
          <p className="text-muted">
            La app cuenta como día sin asistir aquel en que has anotado faltas en todas las horas de tu horario. Los festivos no los conoce: si un día no
            hay clase, simplemente no anotes nada.
          </p>
        </Article>

        <p className="flex gap-2.5 px-1 text-xs leading-relaxed text-muted">
          <Scale size={16} className="mt-0.5 shrink-0" />
          Resumen del Decreto 91/2024, de 5 de junio, del Gobierno de Aragón, por el que se establece la Ordenación de la Formación Profesional del Grado
          D y del Grado E en la Comunidad Autónoma de Aragón. Ante cualquier duda, manda lo que diga tu centro.
        </p>
      </div>
    </Sheet>
  )
}
