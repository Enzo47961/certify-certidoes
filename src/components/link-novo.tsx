'use client';

import { useEffect, useState } from 'react';
import { IconeCopiar, IconeLink } from './icones';

/** Painel recém-criado: sem login, o link é a chave — mostra e oferece copiar. */
export function LinkNovo({ token }: { token: string }) {
  const [copiado, setCopiado] = useState(false);
  const [url, setUrl] = useState(`/p/${token}`);
  useEffect(() => setUrl(`${window.location.origin}/p/${token}`), [token]);
  return (
    <div className="animate-surgir flex flex-wrap items-center gap-3 rounded-2xl border border-selo-400 bg-selo-300/30 p-4">
      <IconeLink size={20} className="text-petroleo-800" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-tinta-900">Guarde este link: ele é a chave do seu painel (não há senha).</p>
        <p className="truncate font-mono text-xs text-tinta-600">{url}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
          } catch {
            /* sem permissão: o link está visível */
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-xl bg-petroleo-800 px-3 py-2 text-sm font-medium text-white hover:bg-petroleo-700"
      >
        <IconeCopiar size={15} /> {copiado ? 'Copiado' : 'Copiar link'}
      </button>
    </div>
  );
}
