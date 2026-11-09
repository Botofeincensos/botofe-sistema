# Boto Fé · Sistema de Gestão

Sistema de gestão da Boto Fé Incensos (clientes, pedidos, produção, estoque e a receber).
Roda no navegador (celular e computador). Dados no Supabase, protegidos por login.

- `index.html` — o sistema inteiro (um único arquivo).
- `supabase/01-schema.sql` — cria as tabelas e as regras de acesso.
- `supabase/02-usuarios.sql` — libera as pessoas que podem entrar (Gestão ou Produção).

Não colocar neste repositório: senhas, a chave secreta (secret/service_role) do Supabase, dados de clientes.
A chave `sb_publishable_...` dentro do `index.html` é pública por desenho; quem protege os dados é o login e as regras do banco.
