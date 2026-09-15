# Ana Energia V3 — Dinâmica

## O que muda nesta versão
A interface não guarda mais o cronograma dentro do JavaScript.

Ela lê:
`data/energia.json`

Esse arquivo é atualizado automaticamente pela automação da Ana a partir do cronograma oficial e também pode ser sincronizado com o Supabase.

## Resultado
Depois de publicar a V3 uma vez no GitHub Pages:
- mudanças de datas;
- docentes;
- UCs;
- novos cursos;
- SGE;
- inícios e encerramentos

podem aparecer no painel sem alterar `index.html`, `app.js` ou `styles.css`.

## Publicação
Substitua os arquivos antigos do GitHub pelos arquivos desta V3, preservando a pasta `supabase/` se quiser manter o código do backend.

Estrutura:
- index.html
- app.js
- styles.css
- manifest.webmanifest
- sw.js
- icon.svg
- README.md
- data/energia.json

## PWA
Abra o GitHub Pages no Edge ou Chrome e use “Instalar aplicativo”.

## Segurança
O JSON público contém somente dados operacionais do painel. Não publique contratos, valores, documentos pessoais, chaves ou segredos.
