'use client';

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ROTULO_ESTADO, type Estado } from '@/lib/situacao';
import { IconeCarregando, IconeFechar } from './icones';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-petroleo-800 text-white hover:bg-petroleo-700 shadow-suave disabled:bg-tinta-300',
  secundario: 'border border-tinta-200 bg-white text-tinta-800 hover:border-tinta-300 hover:bg-tinta-50 disabled:opacity-60',
  fantasma: 'text-tinta-600 hover:bg-tinta-100 hover:text-tinta-900 disabled:opacity-50',
  perigo: 'bg-perigo-600 text-white hover:bg-perigo-700 disabled:opacity-60',
};

export function Botao({
  variante = 'secundario',
  carregando = false,
  tamanho = 'md',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; carregando?: boolean; tamanho?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || carregando}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed ${
        tamanho === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm'
      } ${VARIANTES[variante]} ${className}`}
    >
      {carregando ? <IconeCarregando size={15} /> : null}
      {children}
    </button>
  );
}

export const ESTILO_ESTADO: Record<Estado, { pill: string; ponto: string; texto: string }> = {
  valida: { pill: 'bg-ok-50 text-ok-700 ring-ok-100', ponto: 'bg-ok-600', texto: 'text-ok-700' },
  vencendo: { pill: 'bg-aviso-50 text-aviso-700 ring-aviso-100', ponto: 'bg-aviso-600', texto: 'text-aviso-700' },
  vencida: { pill: 'bg-perigo-50 text-perigo-700 ring-perigo-100', ponto: 'bg-perigo-600', texto: 'text-perigo-700' },
  irregular: { pill: 'bg-perigo-50 text-perigo-700 ring-perigo-100', ponto: 'bg-perigo-600', texto: 'text-perigo-700' },
  pendente: { pill: 'bg-tinta-50 text-tinta-500 ring-tinta-200', ponto: 'bg-tinta-300', texto: 'text-tinta-500' },
};

/** Etiqueta de situação: cor + ponto + texto (nunca só cor). */
export function EtiquetaEstado({ estado, texto, compacta = false }: { estado: Estado; texto?: string; compacta?: boolean }) {
  const e = ESTILO_ESTADO[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset ${compacta ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'} ${e.pill}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${e.ponto}`} />
      {texto ?? ROTULO_ESTADO[estado]}
    </span>
  );
}

export function Modal({ aberto, aoFechar, titulo, children, largura = 'max-w-lg' }: { aberto: boolean; aoFechar: () => void; titulo: string; children: ReactNode; largura?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', tecla);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', tecla);
  }, [aberto, aoFechar]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal aria-label={titulo} className={`animate-surgir w-full ${largura} max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white shadow-alta outline-none sm:rounded-3xl`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-tinta-100 bg-white/95 px-5 py-4 backdrop-blur">
          <h2 className="font-display text-lg font-bold text-tinta-900">{titulo}</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded-lg p-1.5 text-tinta-500 hover:bg-tinta-100 hover:text-tinta-900">
            <IconeFechar />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Gaveta({ aberta, aoFechar, children, rotulo }: { aberta: boolean; aoFechar: () => void; children: ReactNode; rotulo: string }) {
  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', tecla);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = '';
    };
  }, [aberta, aoFechar]);
  if (!aberta) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-tinta-900/30 backdrop-blur-[1px]" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <aside role="dialog" aria-modal aria-label={rotulo} className="animate-deslizar h-full w-full max-w-2xl overflow-y-auto bg-papel shadow-alta">
        {children}
      </aside>
    </div>
  );
}

export function Aviso({ tom = 'info', children }: { tom?: 'info' | 'ok' | 'aviso' | 'perigo'; children: ReactNode }) {
  const cores = {
    info: 'border-petroleo-100 bg-petroleo-50 text-petroleo-800',
    ok: 'border-ok-100 bg-ok-50 text-ok-700',
    aviso: 'border-aviso-100 bg-aviso-50 text-aviso-700',
    perigo: 'border-perigo-100 bg-perigo-50 text-perigo-700',
  }[tom];
  return <div className={`rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed ${cores}`}>{children}</div>;
}

export async function chamar<T>(url: string, init?: RequestInit): Promise<{ ok: true; dados: T } | { ok: false; erro: string; extra: Record<string, unknown> }> {
  try {
    const r = await fetch(url, init);
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) return { ok: false, erro: String(j.erro ?? `Erro ${r.status}`), extra: j };
    return { ok: true, dados: j as T };
  } catch {
    return { ok: false, erro: 'Sem conexão com o servidor.', extra: {} };
  }
}
