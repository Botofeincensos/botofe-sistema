-- Boto Fé · Sistema de Gestão · Etapa 1 · Estrutura do banco
-- Como usar: Supabase > SQL Editor > New query > cole TUDO > Run.
-- Pode rodar de novo sem problema (é seguro repetir).

-- 1) Perfis: quem pode entrar e com qual papel (gestao ou producao)
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  apelido text unique not null,
  nome text,
  papel text not null check (papel in ('gestao','producao'))
);

-- 2) Registros: todos os dados do sistema (clientes, pedidos, produtos...)
create table if not exists public.registros (
  colecao text not null,
  id text not null,
  dados jsonb not null,
  atualizado timestamptz not null default now(),
  atualizado_por uuid default auth.uid(),
  primary key (colecao, id)
);

alter table public.perfis enable row level security;
alter table public.registros enable row level security;

-- Papel de quem está logado (função interna, evita repetição nas regras)
create or replace function public.papel_atual() returns text
language sql stable security definer set search_path = public as
$$ select papel from public.perfis where id = auth.uid() $$;

-- Login por apelido: devolve o e-mail do apelido (só isso, nada mais)
create or replace function public.email_por_apelido(a text) returns text
language sql stable security definer set search_path = public, auth as
$$ select u.email::text from public.perfis p join auth.users u on u.id = p.id
   where lower(p.apelido) = lower(a) limit 1 $$;
revoke all on function public.email_por_apelido(text) from public;
grant execute on function public.email_por_apelido(text) to anon, authenticated;
revoke all on function public.papel_atual() from public;
grant execute on function public.papel_atual() to authenticated;

-- Permissões básicas (garante acesso mesmo se o projeto não expõe tabelas novas automaticamente)
grant usage on schema public to anon, authenticated;
grant select on public.perfis to authenticated;
grant select, insert, update, delete on public.registros to authenticated;

-- Regras de acesso
drop policy if exists perfil_proprio on public.perfis;
create policy perfil_proprio on public.perfis for select to authenticated
  using (id = auth.uid());

drop policy if exists reg_ler on public.registros;
create policy reg_ler on public.registros for select to authenticated
  using (public.papel_atual() in ('gestao','producao'));

drop policy if exists reg_gestao on public.registros;
create policy reg_gestao on public.registros for all to authenticated
  using (public.papel_atual() = 'gestao')
  with check (public.papel_atual() = 'gestao');

-- Produção só altera pedidos, produtos, insumos e movimentos (nunca clientes ou recebimentos)
drop policy if exists reg_producao_ins on public.registros;
create policy reg_producao_ins on public.registros for insert to authenticated
  with check (public.papel_atual() = 'producao' and colecao in ('O','P','M','V','VM'));
drop policy if exists reg_producao_upd on public.registros;
create policy reg_producao_upd on public.registros for update to authenticated
  using (public.papel_atual() = 'producao' and colecao in ('O','P','M','V','VM'))
  with check (public.papel_atual() = 'producao' and colecao in ('O','P','M','V','VM'));
drop policy if exists reg_producao_del on public.registros;
create policy reg_producao_del on public.registros for delete to authenticated
  using (public.papel_atual() = 'producao' and colecao in ('O','P','M','V','VM'));
