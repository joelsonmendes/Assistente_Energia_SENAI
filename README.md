# Ana Energia V2.1 — GitHub Pages Ready

Esta versão já vem com o link padrão da conversa configurado:

https://chatgpt.com/c/6aa80830-031c-83e9-93e9-40541a9f4158

## Fluxo
GitHub → GitHub Pages → instalar como PWA → botão **Falar com a Ana** abre a conversa configurada.

## Publicação no GitHub Pages
1. Extraia o ZIP.
2. Envie todos os arquivos da pasta para a raiz do repositório.
3. No GitHub: Settings → Pages.
4. Em Build and deployment, use:
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
5. Salve e aguarde a URL do GitHub Pages.
6. Abra a URL publicada no Chrome ou Edge.
7. Use a opção **Instalar aplicativo**.

## Configurações já incluídas
- Link padrão da conversa da Ana.
- Supabase do projeto atual.
- Chave publicável do Supabase.
- Edge Function `sync-cronograma`.
- Cronograma oficial.
- PWA com Service Worker.
- Agenda, alertas, laboratórios, mudanças no cronograma e atalhos rápidos.

## Segurança
A aplicação usa somente a chave publicável no frontend.
Nunca coloque `service_role`, senhas ou Client Secret em arquivos do GitHub.

## Observação
A sincronização direta com Google Drive depende do token OAuth do Google. Sem esse token, a interface continua operando com dados já sincronizados no Supabase ou com o modo local de segurança.
