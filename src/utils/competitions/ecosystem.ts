import type { EcoNode } from '@/config/competitions'

export interface EcosystemLink { from: EcoNode; to: EcoNode }
export interface EcosystemCheck {
  /** Nós não alcançáveis a partir da Série D. */
  orphans: EcoNode[]
  /** Nós que não alimentam nenhum outro (exceto o topo, 'mundial'). */
  deadEnds: EcoNode[]
}

/** Checagem do grafo de ligações do ecossistema (T11). Pura. */
export function checkEcosystemGraph(links: readonly EcosystemLink[], start: EcoNode = 'serieD', top: EcoNode = 'mundial'): EcosystemCheck {
  const nodes = new Set<EcoNode>([start, top])
  const out = new Map<EcoNode, EcoNode[]>()
  for (const l of links) {
    nodes.add(l.from)
    nodes.add(l.to)
    out.set(l.from, [...(out.get(l.from) ?? []), l.to])
  }
  const seen = new Set<EcoNode>([start])
  const queue: EcoNode[] = [start]
  while (queue.length) {
    const n = queue.shift() as EcoNode
    for (const t of out.get(n) ?? []) if (!seen.has(t)) { seen.add(t); queue.push(t) }
  }
  const all = [...nodes]
  return {
    orphans: all.filter((n) => !seen.has(n)),
    deadEnds: all.filter((n) => n !== top && !(out.get(n)?.length))
  }
}
