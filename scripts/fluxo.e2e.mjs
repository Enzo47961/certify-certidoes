const BASE = process.argv[2] ?? 'http://localhost:3400';
const j = async (p, init) => { const r = await fetch(BASE + p, init); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t.slice(0, 80); } return { s: r.status, b, r }; };
const post = (p, corpo) => j(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
const ok = (n, v, x = '') => console.log(`${v ? '✓' : '✗'} ${n}${x ? ' — ' + x : ''}`);
const { readFileSync } = await import('node:fs');

const e = await post('/api/espacos', { nome: 'Teste automatizado' }); ok('cria painel', e.s === 200, e.b.token?.slice(0, 6));
const T = e.b.token;
ok('CNPJ inválido recusado', (await post(`/api/p/${T}/empresas`, { cnpj: '00000000000192' })).s === 400);
const add = await post(`/api/p/${T}/empresas`, { cnpj: '00000000000191' }); ok('adiciona CNPJ real (BrasilAPI)', add.s === 200, add.b.empresa?.razao_social + ' ' + add.b.empresa?.municipio + '/' + add.b.empresa?.uf);
const id = add.b.empresa.id;
const t0 = Date.now(); const em = await post(`/api/p/${T}/emitir`, { empresaId: id });
const res = Object.fromEntries((em.b.resultados ?? []).map((x) => [x.tipo, x.emissao.status]));
ok('emissão TCU: emitida, ou assistida se o firewall do TCU estiver limitando', ['emitida', 'assistida'].includes(res.consolidada), `${res.consolidada} em ${Date.now() - t0} ms`);
ok('emissão: demais viram assistidas com link', ['federal','fgts','trabalhista','estadual','municipal','falencia'].every((t) => res[t] === 'assistida'), JSON.stringify(res));
const link = em.b.resultados.find((x) => x.tipo === 'estadual').emissao.link; ok('link estadual aponta para a UF', /DF|dividaativa/.test(link) || link.includes('DF'), link.slice(0, 90));


// Envio assistido: PDF real do TCU
const f = new FormData(); f.set('empresaId', id); f.set('tipo', 'consolidada'); f.set('arquivo', new Blob([readFileSync('scripts/fixture-tcu.pdf')], { type: 'application/pdf' }), 'consulta-tcu.pdf');
const env = await j(`/api/p/${T}/enviar`, { method: 'POST', body: f }); ok('envio de PDF lido', env.s === 200, JSON.stringify(env.b.avisos ?? env.b));
const lista = await j(`/api/p/${T}/empresas`); const cert = lista.b[0].certidoes.find((c) => c.tipo === 'consolidada');
ok('certidão guardada com resultado e validade', cert?.situacao === 'regular' && !!cert?.valida_ate, `${cert?.origem} · ${cert?.situacao} até ${cert?.valida_ate}`);
const pdf = await fetch(`${BASE}/api/p/${T}/arquivo/${cert.id}`); ok('PDF abre (inline)', pdf.status === 200 && (await pdf.arrayBuffer()).byteLength > 5000, pdf.headers.get('content-disposition'));
const leitura = (await j(`/p/${T}/configuracoes`)).b; const tokenLeitura = String(leitura).match(/\/p\/([a-f0-9]{36})/g)?.map((x) => x.slice(3)).find((x) => x !== T);
if (tokenLeitura) {
  ok('link de leitura baixa o PDF', (await fetch(`${BASE}/api/p/${tokenLeitura}/arquivo/${cert.id}`)).status === 200);
  ok('link de leitura NÃO emite', (await post(`/api/p/${tokenLeitura}/emitir`, { empresaId: id })).s === 403);
}
// PDF de OUTRA empresa → recusado
const f2 = new FormData(); f2.set('empresaId', id); f2.set('tipo', 'fgts'); f2.set('arquivo', new Blob([readFileSync(process.env.TEMP + '/outra.pdf')], { type: 'application/pdf' }), 'crf.pdf');
const env2 = await j(`/api/p/${T}/enviar`, { method: 'POST', body: f2 }); ok('PDF de outro CNPJ recusado', env2.s === 422 && env2.b.precisaConfirmar, env2.b.erro);
const f3 = new FormData(); f3.set('empresaId', id); f3.set('arquivo', new Blob([Buffer.from('não é pdf')]), 'x.pdf');
ok('arquivo que não é PDF recusado', (await j(`/api/p/${T}/enviar`, { method: 'POST', body: f3 })).s === 422);

const zip = await fetch(`${BASE}/api/p/${T}/pasta`); const zb = new Uint8Array(await zip.arrayBuffer());
ok('pasta ZIP', zip.status === 200 && zb[0] === 0x50 && zb[1] === 0x4b, `${zb.length} bytes`);
const esp = await j(`/p/${T}/configuracoes`); const tl = String(esp.b).length;
// Configuração
ok('webhook interno bloqueado', (await post(`/api/p/${T}/config`, { webhook_url: 'https://127.0.0.1/x' })).s === 400);
ok('webhook http bloqueado', (await post(`/api/p/${T}/config`, { webhook_url: 'http://exemplo.com' })).s === 400);
const cfg = await post(`/api/p/${T}/config`, { alerta_dias: 20, alerta_ativo: true, webhook_url: 'https://webhook.site/certify-teste' });
ok('configuração salva', cfg.s === 200 && cfg.b.espaco.alerta_dias === 20 && cfg.b.espaco.token === undefined);
console.log('TOKEN', T);
