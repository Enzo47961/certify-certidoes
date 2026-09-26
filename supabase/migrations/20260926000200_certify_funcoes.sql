-- Funções de acesso do CERTIFY. Todas exigem o segredo do servidor.

-- Espaço por token (admin) ou token de leitura. Devolve 'leitura' = true no segundo caso.
create or replace function public.certify_espaco(p_segredo text, p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare e certidoes.espacos;
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  select * into e from certidoes.espacos where token = p_token;
  if found then return to_jsonb(e) || jsonb_build_object('leitura', false); end if;
  select * into e from certidoes.espacos where token_leitura = p_token;
  if found then
    return jsonb_build_object('id', e.id, 'nome', e.nome, 'demo', e.demo, 'token_leitura', e.token_leitura, 'leitura', true);
  end if;
  return null;
end $$;

create or replace function public.certify_espaco_demo(p_segredo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e certidoes.espacos;
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  select * into e from certidoes.espacos where demo order by criado_em limit 1;
  if not found then
    insert into certidoes.espacos (nome, demo, alerta_dias) values ('Contabilidade Horizonte (demonstração)', true, 15) returning * into e;
  end if;
  return to_jsonb(e) || jsonb_build_object('leitura', false);
end $$;

create or replace function public.certify_criar_espaco(p_segredo text, p_nome text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e certidoes.espacos;
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  insert into certidoes.espacos (nome) values (coalesce(nullif(trim(p_nome), ''), 'Meu painel')) returning * into e;
  return to_jsonb(e) || jsonb_build_object('leitura', false);
end $$;

-- Empresas do espaço com a certidão vigente (mais recente) de cada tipo.
create or replace function public.certify_empresas(p_segredo text, p_espaco uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(emp) || jsonb_build_object('certidoes', coalesce((
      select jsonb_agg(to_jsonb(v) order by v.tipo) from certidoes.vigentes v where v.empresa_id = emp.id
    ), '[]'::jsonb)) order by emp.razao_social)
    from certidoes.empresas emp where emp.espaco_id = p_espaco
  ), '[]'::jsonb);
end $$;

create or replace function public.certify_adicionar_empresa(p_segredo text, p_espaco uuid, p_empresa jsonb, p_max int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare emp certidoes.empresas; total int;
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  select count(*) into total from certidoes.empresas where espaco_id = p_espaco;
  if total >= p_max then raise exception 'LIMITE_EMPRESAS'; end if;
  insert into certidoes.empresas (espaco_id, cnpj, razao_social, nome_fantasia, uf, municipio, codigo_ibge)
  values (p_espaco, p_empresa->>'cnpj', p_empresa->>'razao_social', p_empresa->>'nome_fantasia',
          p_empresa->>'uf', p_empresa->>'municipio', p_empresa->>'codigo_ibge')
  on conflict (espaco_id, cnpj) do update set razao_social = excluded.razao_social
  returning * into emp;
  return to_jsonb(emp);
end $$;

create or replace function public.certify_remover_empresa(p_segredo text, p_espaco uuid, p_empresa uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  delete from certidoes.empresas where id = p_empresa and espaco_id = p_espaco;
end $$;

-- Grava uma certidão (PDF em base64). Confere que a empresa é do espaço.
create or replace function public.certify_salvar_certidao(p_segredo text, p_espaco uuid, p_certidao jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare novo uuid;
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  if not exists (select 1 from certidoes.empresas where id = (p_certidao->>'empresa_id')::uuid and espaco_id = p_espaco) then
    raise exception 'EMPRESA_INVALIDA';
  end if;
  insert into certidoes.certidoes (empresa_id, tipo, situacao, numero, emitida_em, valida_ate, origem, arquivo, arquivo_nome, detalhes, criado_em)
  values ((p_certidao->>'empresa_id')::uuid, p_certidao->>'tipo', p_certidao->>'situacao', p_certidao->>'numero',
          (p_certidao->>'emitida_em')::timestamptz, (p_certidao->>'valida_ate')::date, p_certidao->>'origem',
          decode(nullif(p_certidao->>'arquivo', ''), 'base64'), p_certidao->>'arquivo_nome',
          coalesce(p_certidao->'detalhes', '{}'::jsonb), coalesce((p_certidao->>'criado_em')::timestamptz, now()))
  returning id into novo;
  return (select to_jsonb(l) from certidoes.lista l where l.id = novo);
end $$;

create or replace function public.certify_arquivo(p_segredo text, p_espaco uuid, p_certidao uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  return (select jsonb_build_object('nome', c.arquivo_nome, 'arquivo', encode(c.arquivo, 'base64'))
          from certidoes.certidoes c join certidoes.empresas e on e.id = c.empresa_id
          where c.id = p_certidao and e.espaco_id = p_espaco and c.arquivo is not null);
end $$;

create or replace function public.certify_historico(p_segredo text, p_espaco uuid, p_empresa uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  return coalesce((select jsonb_agg(to_jsonb(c) order by c.criado_em desc)
    from certidoes.lista c join certidoes.empresas e on e.id = c.empresa_id
    where e.id = p_empresa and e.espaco_id = p_espaco), '[]'::jsonb);
end $$;

-- Certidões vigentes com o PDF (pasta ZIP, e-mail, página de download).
create or replace function public.certify_vigentes_com_arquivo(p_segredo text, p_espaco uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(v) || jsonb_build_object('arquivo', encode(c.arquivo, 'base64'),
                     'empresa', e.razao_social, 'cnpj', e.cnpj, 'uf', e.uf))
    from certidoes.empresas e
    join certidoes.vigentes v on v.empresa_id = e.id
    join certidoes.certidoes c on c.id = v.id
    where e.espaco_id = p_espaco and c.arquivo is not null
  ), '[]'::jsonb);
end $$;

create or replace function public.certify_configurar(p_segredo text, p_espaco uuid, p_config jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e certidoes.espacos;
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  update certidoes.espacos set
    nome = coalesce(nullif(trim(p_config->>'nome'), ''), nome),
    email = case when p_config ? 'email' then nullif(trim(p_config->>'email'), '') else email end,
    rotina_ativa = coalesce((p_config->>'rotina_ativa')::boolean, rotina_ativa),
    rotina_dia = coalesce((p_config->>'rotina_dia')::int, rotina_dia),
    rotina_hora = coalesce((p_config->>'rotina_hora')::int, rotina_hora),
    alerta_ativo = coalesce((p_config->>'alerta_ativo')::boolean, alerta_ativo),
    alerta_dias = coalesce((p_config->>'alerta_dias')::int, alerta_dias),
    webhook_url = case when p_config ? 'webhook_url' then nullif(trim(p_config->>'webhook_url'), '') else webhook_url end,
    ultimo_envio = coalesce((p_config->>'ultimo_envio')::timestamptz, ultimo_envio)
  where id = p_espaco returning * into e;
  return to_jsonb(e);
end $$;

create or replace function public.certify_evento(p_segredo text, p_espaco uuid, p_tipo text, p_status text, p_detalhe text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  insert into certidoes.eventos (espaco_id, tipo, status, detalhe) values (p_espaco, p_tipo, p_status, left(p_detalhe, 500));
  delete from certidoes.eventos where espaco_id = p_espaco and id not in
    (select id from certidoes.eventos where espaco_id = p_espaco order by criado_em desc limit 60);
end $$;

create or replace function public.certify_eventos(p_segredo text, p_espaco uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  return coalesce((select jsonb_agg(to_jsonb(ev) order by ev.criado_em desc)
    from (select * from certidoes.eventos where espaco_id = p_espaco order by criado_em desc limit 30) ev), '[]'::jsonb);
end $$;

-- Espaços com rotina de e-mail ou alerta ligados (o agendador decide o que enviar).
create or replace function public.certify_espacos_agendados(p_segredo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  return coalesce((select jsonb_agg(to_jsonb(e)) from certidoes.espacos e
    where e.email is not null and (e.rotina_ativa or e.alerta_ativo) and not e.demo), '[]'::jsonb);
end $$;

-- Certidões vigentes que cruzaram um marco de aviso (N dias, 7, 1, vencida) ainda não avisado.
create or replace function public.certify_alertas_pendentes(p_segredo text, p_espaco uuid, p_dias int)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(c) || jsonb_build_object('empresa', e.razao_social, 'cnpj', e.cnpj, 'marco', m.marco))
    from certidoes.empresas e
    join certidoes.vigentes c on c.empresa_id = e.id
    cross join lateral (
      -- marco mais urgente já alcançado (15 → 7 → 1 → 0 = vencida)
      select min(x) as marco from unnest(array[p_dias, 7, 1, 0]) x
      where c.valida_ate is not null and (c.valida_ate - (now() at time zone 'America/Sao_Paulo')::date) <= x
    ) m
    where e.espaco_id = p_espaco and m.marco is not null
      and not exists (select 1 from certidoes.alertas_enviados a where a.certidao_id = c.id and a.marco <= m.marco)
  ), '[]'::jsonb);
end $$;

create or replace function public.certify_marcar_alertas(p_segredo text, p_itens jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  insert into certidoes.alertas_enviados (certidao_id, marco)
  select (i->>'id')::uuid, (i->>'marco')::int from jsonb_array_elements(p_itens) i
  on conflict do nothing;
end $$;

-- Janela deslizante de uso (demo pública): true = pode.
create or replace function public.certify_consumir(p_segredo text, p_chave text, p_acao text, p_limite int, p_janela_horas int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  perform pg_advisory_xact_lock(hashtext('certify:' || p_chave || p_acao));
  select count(*) into n from certidoes.usos
    where chave = p_chave and acao = p_acao and criado_em > now() - make_interval(hours => p_janela_horas);
  if n >= p_limite then return false; end if;
  insert into certidoes.usos (chave, acao) values (p_chave, p_acao);
  delete from certidoes.usos where criado_em < now() - interval '7 days';
  return true;
end $$;

-- Recomeça a demonstração: apaga empresas e histórico do espaço demo (o app recria).
create or replace function public.certify_limpar_demo(p_segredo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare e uuid;
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  select id into e from certidoes.espacos where demo order by criado_em limit 1;
  delete from certidoes.empresas where espaco_id = e;
  delete from certidoes.eventos where espaco_id = e;
  update certidoes.espacos set webhook_url = null, email = null, rotina_ativa = false where id = e;
  return e;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'certify_espaco(text,text)', 'certify_espaco_demo(text)', 'certify_criar_espaco(text,text)', 'certify_empresas(text,uuid)',
    'certify_adicionar_empresa(text,uuid,jsonb,int)', 'certify_remover_empresa(text,uuid,uuid)', 'certify_salvar_certidao(text,uuid,jsonb)',
    'certify_arquivo(text,uuid,uuid)', 'certify_historico(text,uuid,uuid)', 'certify_vigentes_com_arquivo(text,uuid)',
    'certify_configurar(text,uuid,jsonb)', 'certify_evento(text,uuid,text,text,text)', 'certify_eventos(text,uuid)',
    'certify_espacos_agendados(text)', 'certify_alertas_pendentes(text,uuid,int)', 'certify_marcar_alertas(text,jsonb)',
    'certify_consumir(text,text,text,int,int)', 'certify_limpar_demo(text)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon', f);
  end loop;
end $$;

revoke all on schema certidoes from anon, authenticated;
