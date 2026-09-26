-- CERTIFY · certidões em dia.
-- Schema próprio, fora da API REST do Supabase: tudo passa pelas funções
-- public.certify_*, que exigem o segredo do servidor (CERTIFY_SEGREDO).
create extension if not exists pgcrypto;
create table if not exists public.segredos (nome text primary key, valor text not null);
alter table public.segredos enable row level security;
insert into public.segredos (nome, valor) values ('certidoes', encode(gen_random_bytes(32), 'hex')) on conflict (nome) do nothing;

create schema if not exists certidoes;

-- Um "espaço" é o painel de um escritório/empresa. Sem login: quem tem o link
-- (token de 144 bits) administra; o token de leitura só vê e baixa.
create table if not exists certidoes.espacos (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  token_leitura text not null unique default encode(gen_random_bytes(18), 'hex'),
  nome text not null default 'Meu painel',
  demo boolean not null default false,
  email text,
  rotina_ativa boolean not null default false,
  rotina_dia int not null default 1 check (rotina_dia between 0 and 6),   -- 0 = domingo
  rotina_hora int not null default 8 check (rotina_hora between 0 and 23),
  alerta_ativo boolean not null default true,
  alerta_dias int not null default 15 check (alerta_dias between 1 and 90),
  webhook_url text,
  webhook_segredo text not null default encode(gen_random_bytes(16), 'hex'),
  ultimo_envio timestamptz,
  criado_em timestamptz not null default now()
);

create table if not exists certidoes.empresas (
  id uuid primary key default gen_random_uuid(),
  espaco_id uuid not null references certidoes.espacos (id) on delete cascade,
  cnpj text not null check (cnpj ~ '^\d{14}$'),
  razao_social text not null,
  nome_fantasia text,
  uf text,
  municipio text,
  codigo_ibge text,
  criado_em timestamptz not null default now(),
  unique (espaco_id, cnpj)
);

-- Histórico completo: a certidão vigente de cada tipo é a mais recente.
create table if not exists certidoes.certidoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references certidoes.empresas (id) on delete cascade,
  tipo text not null,
  situacao text not null,
  numero text,
  emitida_em timestamptz,
  valida_ate date,
  origem text not null,
  arquivo bytea,
  arquivo_nome text,
  detalhes jsonb not null default '{}',
  criado_em timestamptz not null default now()
);
create index if not exists certidoes_empresa_tipo_idx on certidoes.certidoes (empresa_id, tipo, criado_em desc);

create table if not exists certidoes.eventos (
  id bigint generated always as identity primary key,
  espaco_id uuid not null references certidoes.espacos (id) on delete cascade,
  tipo text not null,
  status text not null,
  detalhe text,
  criado_em timestamptz not null default now()
);
create index if not exists eventos_espaco_idx on certidoes.eventos (espaco_id, criado_em desc);

create table if not exists certidoes.alertas_enviados (
  certidao_id uuid not null references certidoes.certidoes (id) on delete cascade,
  marco int not null,
  enviado_em timestamptz not null default now(),
  primary key (certidao_id, marco)
);

-- Limite de uso da demonstração pública (hash de IP, nunca o IP).
create table if not exists certidoes.usos (
  id bigint generated always as identity primary key,
  chave text not null,
  acao text not null,
  criado_em timestamptz not null default now()
);
create index if not exists usos_chave_idx on certidoes.usos (chave, acao, criado_em desc);

create or replace function certidoes.autorizado(p_segredo text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.segredos where nome = 'certidoes' and valor = p_segredo);
$$;

-- Certidões sem o PDF (para listas), e a vigente de cada tipo por empresa.
create or replace view certidoes.lista as
  select id, empresa_id, tipo, situacao, numero, emitida_em, valida_ate, origem, arquivo_nome,
         arquivo is not null as tem_arquivo, detalhes, criado_em
  from certidoes.certidoes;

create or replace view certidoes.vigentes as
  select distinct on (empresa_id, tipo) * from certidoes.lista order by empresa_id, tipo, criado_em desc;
