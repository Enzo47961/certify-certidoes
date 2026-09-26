'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconeSeta } from './icones';
import { Botao, chamar } from './ui';

/** Botões da página inicial: demonstração, criar painel e painéis já abertos neste navegador. */
export function Comecar({ claro = false }: { claro?: boolean }) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [meus, setMeus] = useState<Array<{ token: string; nome: string }>>([]);

  useEffect(() => {
    try {
      setMeus(JSON.parse(localStorage.getItem('certify:paineis') ?? '[]'));
    } catch {
      /* sem armazenamento local */
    }
  }, []);

  async function criar() {
    setCriando(true);
    setErro(null);
    const r = await chamar<{ token: string }>('/api/espacos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    if (r.ok) router.push(`/p/${r.dados.token}?novo=1`);
    else {
      setErro(r.erro);
      setCriando(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <Link href="/demo" className="inline-flex items-center gap-2 rounded-xl bg-selo-400 px-5 py-3 font-semibold text-tinta-900 shadow-suave transition hover:bg-selo-300">
          Ver demonstração <IconeSeta size={17} />
        </Link>
        <Botao onClick={criar} carregando={criando} className={`px-5 py-3 text-base ${claro ? 'border-white/25 bg-white/10 text-white hover:bg-white/20' : ''}`}>
          Criar meu painel grátis
        </Botao>
      </div>
      {erro ? <p className={`mt-3 text-sm ${claro ? 'text-selo-300' : 'text-perigo-700'}`}>{erro}</p> : null}
      {meus.length > 0 ? (
        <p className={`mt-4 text-sm ${claro ? 'text-petroleo-100' : 'text-tinta-600'}`}>
          Seus painéis neste navegador:{' '}
          {meus.map((p, i) => (
            <span key={p.token}>
              {i > 0 ? ' · ' : ''}
              <Link href={`/p/${p.token}`} className="font-semibold underline underline-offset-2">
                {p.nome}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
