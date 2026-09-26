import { redirect } from 'next/navigation';
import { recriarDemo } from '@/lib/acoes';
import { empresasDo, espacoDemo } from '@/lib/dados';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** /demo → painel da demonstração (recriado se estiver vazio). */
export default async function Demo() {
  let espaco = await espacoDemo();
  if ((await empresasDo(espaco.id)).length === 0) espaco = await recriarDemo();
  redirect(`/p/${espaco.token}`);
}
