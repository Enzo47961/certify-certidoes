'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cnpjValido, formatarCnpj, soDigitos } from '@/lib/cnpj';
import { IconeCheck, IconeSelo } from './icones';
import { Aviso, Botao, Modal, chamar } from './ui';

type Dados = { razao_social: string; nome_fantasia: string | null; uf: string | null; municipio: string | null; situacao: string | null };

const mascara = (v: string) => {
  const d = soDigitos(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export function AdicionarEmpresa({ aberto, aoFechar, token, demo, aoAdicionar }: { aberto: boolean; aoFechar: () => void; token: string; demo: boolean; aoAdicionar: (id: string) => void }) {
  const router = useRouter();
  const [cnpj, setCnpj] = useState('');
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<'digitando' | 'buscando' | 'salvando' | 'emitindo'>('digitando');

  const digitos = soDigitos(cnpj);
  useEffect(() => {
    setDados(null);
    setErro(null);
    if (digitos.length !== 14) return;
    if (!cnpjValido(digitos)) {
      setErro('CNPJ inválido: confira os dígitos.');
      return;
    }
    let ativo = true;
    setEtapa('buscando');
    chamar<Dados>(`/api/cnpj/${digitos}`).then((r) => {
      if (!ativo) return;
      setEtapa('digitando');
      if (r.ok) setDados(r.dados);
      else setErro(r.erro);
    });
    return () => {
      ativo = false;
    };
  }, [digitos]);

  async function criarPainel() {
    const r = await chamar<{ token: string }>('/api/espacos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    if (r.ok) router.push(`/p/${r.dados.token}?novo=1`);
    else setErro(r.erro);
  }

  async function adicionar() {
    setEtapa('salvando');
    setErro(null);
    const r = await chamar<{ empresa: { id: string } }>(`/api/p/${token}/empresas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cnpj: digitos }),
    });
    if (!r.ok) {
      setErro(r.erro);
      setEtapa('digitando');
      return;
    }
    // Já emite o que for automático (a consulta consolidada do TCU, e o resto se houver Infosimples).
    setEtapa('emitindo');
    await chamar(`/api/p/${token}/emitir`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ empresaId: r.dados.empresa.id }) });
    setCnpj('');
    setEtapa('digitando');
    aoAdicionar(r.dados.empresa.id);
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Adicionar empresa">
      {demo ? (
        <div className="space-y-4 text-sm text-tinta-600">
          <p>
            A demonstração usa só empresas fictícias, com certidões de exemplo. Para acompanhar empresas reais, crie o seu painel: é grátis, sem cadastro, e a
            consulta do TCU sai de verdade na hora.
          </p>
          {erro ? <Aviso tom="perigo">{erro}</Aviso> : null}
          <Botao variante="primario" onClick={criarPainel} className="w-full">
            Criar meu painel
          </Botao>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-tinta-700">CNPJ</span>
            <input
              autoFocus
              inputMode="numeric"
              value={cnpj}
              onChange={(e) => setCnpj(mascara(e.target.value))}
              placeholder="00.000.000/0000-00"
              className="mt-1 w-full rounded-xl border border-tinta-200 px-3.5 py-3 font-mono text-lg tracking-wide outline-none focus:border-petroleo-400"
            />
          </label>

          {etapa === 'buscando' ? <p className="text-sm text-tinta-500">Consultando a Receita Federal…</p> : null}
          {dados ? (
            <div className="animate-surgir rounded-2xl border border-petroleo-100 bg-petroleo-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-petroleo-700">
                <IconeCheck size={14} /> Encontrada na Receita
              </p>
              <p className="mt-1 font-semibold text-tinta-900">{dados.razao_social}</p>
              <p className="text-sm text-tinta-600">
                {formatarCnpj(digitos)} · {dados.municipio ?? '—'}/{dados.uf ?? '—'}
                {dados.situacao ? ` · ${dados.situacao}` : ''}
              </p>
              {dados.situacao && dados.situacao.toUpperCase() !== 'ATIVA' ? (
                <p className="mt-2 text-sm text-aviso-700">A situação cadastral não é “ativa”: os órgãos podem recusar a emissão.</p>
              ) : null}
            </div>
          ) : null}
          {erro ? <Aviso tom="perigo">{erro}</Aviso> : null}

          <Botao variante="primario" className="w-full" disabled={!dados} carregando={etapa === 'salvando' || etapa === 'emitindo'} onClick={adicionar}>
            {etapa === 'emitindo' ? 'Emitindo o que é automático…' : (<><IconeSelo size={16} /> Adicionar e emitir certidões</>)}
          </Botao>
          <p className="text-xs leading-relaxed text-tinta-500">
            Os dados vêm do cadastro público do CNPJ. Em seguida o CERTIFY emite a consulta consolidada do TCU (oficial e automática) e mostra, para cada
            outra certidão, o link do site certo para emitir.
          </p>
        </div>
      )}
    </Modal>
  );
}
