# Assistente Energia SENAI V2 — Vercel + Supabase

## O que esta V2 entrega
- PWA instalável no Windows/Android/iPhone.
- Login Google via Supabase Auth.
- Leitura autenticada do cronograma oficial no Google Drive.
- Importação automática do `.xlsx` sem editar a fonte.
- PostgreSQL no Supabase com RLS por usuário.
- Dashboard dinâmico.
- Cursos, docentes, alertas, calendário e histórico de alterações.
- Notas sincronizadas.
- Consultas rápidas em linguagem natural simples.
- Detecção de novos registros, alterações e registros removidos.

## 1. Supabase
Crie/abra o projeto e execute `supabase/migrations/001_init.sql` no SQL Editor.

Em Authentication > Providers > Google:
1. Ative Google.
2. Configure Client ID e Client Secret do Google Cloud.
3. Em Google Cloud OAuth, use a callback URL indicada pelo Supabase.
4. Adicione a URL do seu Vercel em Authentication > URL Configuration > Redirect URLs.

O aplicativo pede o escopo:
`https://www.googleapis.com/auth/drive.readonly`

Isso permite ao usuário autenticado ler arquivos do Drive aos quais ele já tem acesso.

## 2. Vercel — Environment Variables
Configure em Project Settings > Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRONOGRAMA_FILE_ID=1vX35JOwsYnmFEOacJNPijK3q1OLfXiZ6`

IMPORTANTE: `SUPABASE_SERVICE_ROLE_KEY` é segredo. Nunca coloque no frontend nem no GitHub.

## 3. Deploy
Se o projeto já está no Vercel:
1. Substitua os arquivos pela V2.
2. Faça commit/push.
3. O Vercel fará deploy.
4. Entre com Google.
5. Clique `Sincronizar cronograma`.

## 4. Fluxo
PWA -> Supabase Auth -> API Vercel -> Google Drive (read-only) -> XLSX -> Supabase PostgreSQL -> Dashboard

## 5. Segurança
- A planilha original não é alterada.
- A chave service role fica somente no servidor.
- RLS impede um usuário autenticado de ler registros de outro usuário.
- O token Google usado para sincronizar é enviado apenas para a função serverless durante a sincronização.

## 6. Primeira sincronização
No primeiro clique em `Sincronizar cronograma`, todos os registros de Energia serão cadastrados como `created`.
Nas sincronizações seguintes, o painel registra apenas mudanças.

## 7. Observação importante
A classificação de Energia usa palavras-chave para Eletrotécnica, Energias Renováveis, Fotovoltaica, Eletricista Industrial, Instalações Elétricas, NR-10/SEP, Eficiência Energética, Biomassa e Eólica. Ajuste `ENERGY_TERMS` em `api/sync.js` se surgirem novas nomenclaturas.
