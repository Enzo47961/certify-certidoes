import { NextResponse } from 'next/server';
import { rodarAgendador } from '@/lib/agendador';
import { recriarDemo } from '@/lib/acoes';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/agendador — chamado de hora em hora pelo pg_cron do Supabase
 * (Authorization: Bearer CRON_SECRET). ?demo=1 força recriar a demonstração.
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  }
  if (new URL(request.url).searchParams.get('demo') === '1') {
    await recriarDemo();
    return NextResponse.json({ demo: 'recriada' });
  }
  return NextResponse.json(await rodarAgendador());
}
