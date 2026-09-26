-- Remove o envio por e-mail (sem domínio próprio o Resend só entrega ao dono da conta).
-- O alerta de vencimento passa a sair pelo webhook, uma vez por dia.
alter table certidoes.espacos
  drop column if exists email,
  drop column if exists rotina_ativa,
  drop column if exists rotina_dia,
  drop column if exists rotina_hora,
  drop column if exists ultimo_envio;

create or replace function public.certify_configurar(p_segredo text, p_espaco uuid, p_config jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e certidoes.espacos;
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  update certidoes.espacos set
    nome = coalesce(nullif(trim(p_config->>'nome'), ''), nome),
    alerta_ativo = coalesce((p_config->>'alerta_ativo')::boolean, alerta_ativo),
    alerta_dias = coalesce((p_config->>'alerta_dias')::int, alerta_dias),
    webhook_url = case when p_config ? 'webhook_url' then nullif(trim(p_config->>'webhook_url'), '') else webhook_url end
  where id = p_espaco returning * into e;
  return to_jsonb(e);
end $$;

-- Espaços que recebem o aviso diário de vencimento (integração configurada).
create or replace function public.certify_espacos_agendados(p_segredo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  return coalesce((select jsonb_agg(to_jsonb(e)) from certidoes.espacos e
    where e.webhook_url is not null and e.alerta_ativo and not e.demo), '[]'::jsonb);
end $$;

create or replace function public.certify_limpar_demo(p_segredo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare e uuid;
begin
  if not certidoes.autorizado(p_segredo) then raise exception 'NAO_AUTORIZADO'; end if;
  select id into e from certidoes.espacos where demo order by criado_em limit 1;
  delete from certidoes.empresas where espaco_id = e;
  delete from certidoes.eventos where espaco_id = e;
  update certidoes.espacos set webhook_url = null where id = e;
  return e;
end $$;
