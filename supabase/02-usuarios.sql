-- Boto Fé · Etapa 1 · Cadastro dos usuários
-- ANTES: no Supabase vá em Authentication > Users > Add user > Create new user,
-- informe e-mail e senha e MARQUE "Auto Confirm User". Faça isso para cada pessoa.
-- DEPOIS: edite o e-mail, apelido e nome da 2ª pessoa abaixo e rode este arquivo no SQL Editor.
-- papel 'gestao' = acesso total (Gestão e Produção, com o seletor no menu).
-- papel 'producao' = só Produção e Estoque (fica disponível para pessoas futuras).

-- 1ª pessoa: Gabriel
insert into public.perfis (id, apelido, nome, papel)
select id, 'gabriel', 'Gabriel', 'gestao' from auth.users where email = 'botofeincensos@gmail.com'
on conflict (id) do update set apelido = excluded.apelido, nome = excluded.nome, papel = excluded.papel;

-- 2ª pessoa: troque o e-mail, o apelido e o nome (acesso total, igual ao Gabriel)
insert into public.perfis (id, apelido, nome, papel)
select id, 'apelido2', 'Nome da pessoa', 'gestao' from auth.users where email = 'EMAIL_DA_PESSOA@exemplo.com'
on conflict (id) do update set apelido = excluded.apelido, nome = excluded.nome, papel = excluded.papel;

-- Conferir quem tem acesso (aparece uma tabela ao rodar):
select p.apelido, p.nome, p.papel, u.email from public.perfis p join auth.users u on u.id = p.id;
