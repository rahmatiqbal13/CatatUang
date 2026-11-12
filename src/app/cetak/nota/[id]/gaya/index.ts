import type { NotaStyle } from './shared'
import { klasik } from './klasik'
import { sederhana } from './sederhana'
import { kontan } from './kontan'
import { minimalis } from './minimalis'
import { faktur } from './faktur'
import { mesinKetik } from './mesin-ketik'
import { tegas } from './tegas'

/** Every nota style, in picker order. The first is the default. */
export const NOTA_STYLES: NotaStyle[] = [klasik, sederhana, kontan, minimalis, faktur, mesinKetik, tegas]

/** Look a style up by id, falling back to the default for unknown/stale ids. */
export const styleById = (id: string | null | undefined) =>
  NOTA_STYLES.find(s => s.id === id) ?? NOTA_STYLES[0]
