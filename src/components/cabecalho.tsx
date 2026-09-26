import Link from 'next/link';
import { IconeEngrenagem, IconeSelo } from './icones';

export function Marca({ claro = false }: { claro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-petroleo-800 text-selo-400">
        <IconeSelo size={18} />
      </span>
      <span className={`font-display text-lg font-extrabold tracking-tight ${claro ? 'text-white' : 'text-tinta-900'}`}>CERTIFY</span>
    </span>
  );
}

export function Cabecalho({ token, nome, demo, ativo }: { token: string; nome: string; demo: boolean; ativo: 'painel' | 'config' }) {
  const aba = (href: string, rotulo: React.ReactNode, sel: boolean) => (
    <Link
      href={href}
      aria-current={sel ? 'page' : undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${sel ? 'bg-petroleo-800 text-white' : 'text-tinta-600 hover:bg-tinta-100'}`}
    >
      {rotulo}
    </Link>
  );
  return (
    <header className="border-b border-tinta-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="CERTIFY — início">
            <Marca />
          </Link>
          <span className="hidden h-6 w-px bg-tinta-200 sm:block" />
          <span className="truncate text-sm font-medium text-tinta-700">{nome}</span>
          {demo ? <span className="rounded-full bg-selo-300/60 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-tinta-800">Demonstração</span> : null}
        </div>
        <nav className="flex gap-1" aria-label="Seções do painel">
          {aba(`/p/${token}`, 'Painel', ativo === 'painel')}
          {aba(`/p/${token}/configuracoes`, (<><IconeEngrenagem size={15} /> Exportar e integrar</>), ativo === 'config')}
        </nav>
      </div>
    </header>
  );
}
