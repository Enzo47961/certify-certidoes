import Link from 'next/link';
import { Marca } from '@/components/cabecalho';

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Marca />
      <h1 className="font-display text-2xl font-extrabold">Painel não encontrado</h1>
      <p className="max-w-md text-tinta-600">O link pode estar incompleto. Os painéis do CERTA não têm senha: o endereço completo é a chave de acesso.</p>
      <div className="flex gap-3">
        <Link href="/" className="rounded-xl bg-petroleo-800 px-4 py-2.5 text-sm font-medium text-white">Página inicial</Link>
        <Link href="/demo" className="rounded-xl border border-tinta-200 px-4 py-2.5 text-sm font-medium">Ver demonstração</Link>
      </div>
    </main>
  );
}
