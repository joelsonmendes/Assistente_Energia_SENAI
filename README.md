# Assistente Energia SENAI — V3 GitHub Pages + Supabase

Versão preparada para hospedagem estática no GitHub Pages, sem dependência do Vercel.

## Arquitetura

GitHub Pages → Supabase Auth → Supabase Edge Function `sync-cronograma` → Google Drive → Supabase PostgreSQL.

## Publicação

Substitua os arquivos da branch `main` do repositório `joelsonmendes/Assistente_Energia_SENAI` pelos arquivos desta pasta. O GitHub Pages deve publicar a raiz da branch `main`.

URL esperada: `https://joelsonmendes.github.io/Assistente_Energia_SENAI/`

## Supabase

Projeto já apontado no frontend: `yeaseskoklzwtgneasfi`. A chave usada no navegador é a chave **publishable**, própria para frontend. Nenhuma chave secreta foi incluída neste pacote.

A Edge Function `sync-cronograma` deve permanecer ativa com verificação JWT habilitada.

## Autenticação Google

No Supabase, habilite o provedor Google e configure o OAuth. Adicione a URL do GitHub Pages como URL permitida de redirecionamento:

`https://joelsonmendes.github.io/Assistente_Energia_SENAI/`

O app solicita o escopo `drive.readonly` para ler apenas o cronograma autorizado no Google Drive.

## PWA

Os caminhos de `manifest.webmanifest`, `app.js`, `styles.css`, `icon.svg` e `sw.js` foram corrigidos para funcionar dentro do subdiretório `/Assistente_Energia_SENAI/` do GitHub Pages.
