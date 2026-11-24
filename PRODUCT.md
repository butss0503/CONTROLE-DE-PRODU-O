# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **PCP da Grande Aço (usuário principal):** no PC do escritório, lança a produção por máquina e bitola, as paradas, o fechamento semanal, a meta do mês, a carteira de pedidos e a sucata. Também acompanha se o mês vai bater a meta.
- **Gerência e diretoria:** consultam o resultado do mês e do ano no PC, no celular e em reuniões. Precisam saber rápido se a meta vai ser batida, qual é a projeção e onde está o problema.
- **Comercial e vendas:** consultam a carteira de pedidos por bitola, ou seja, quanto ainda falta produzir.

## Product Purpose

É o dashboard de produção e controle de sucata da Grande Aço (MES/PCP) para vergalhão cortado e dobrado. Ele mostra:

- produção do mês contra a meta, com projeção e ritmo diário;
- produção semanal;
- produção por máquina e bitola;
- carteira restante por bitola;
- disponibilidade das máquinas (horas paradas);
- sucata, em kg, R$ e índice de refugo.

O sistema funciona bem quando qualquer pessoa entende em segundos a situação do mês e o PCP lança os dados sem erro.

## Operating Context

- **Onde é usado:** PC do escritório do PCP, celular da gerência e do comercial, apresentação em reunião e relatório impresso. O Modo Telão existe, que alterna as abas a cada 25 s, mas não é o uso principal.
- **Máquinas:** estribadeiras ES02, EB10, EB12 e 20B, e a dobradeira manual PT 32.
- **Bitolas:** de 4,20 mm a 32,00 mm.
- **Calendário:** semanas do mês fixas (dias 1–7, 8–14, 15–21, 22–28, 29–31), dias úteis de segunda a sexta e 8 h programadas por máquina por dia.
- **Unidades:** kg ou toneladas, à escolha. Sucata em R$/kg.
- **Exportação:** CSV do mês, CSV da sucata, impressão e backup em .json.

## Capabilities and Constraints

- **Tecnologia:** HTML, CSS e JS estáticos (index.html, style.css, app.js), publicados no GitHub Pages: https://butss0503.github.io/CONTROLE-DE-PRODU-O/. O backend é Google Apps Script (Code.gs) com os dados numa planilha do Google. Gráficos com Chart.js e o plugin datalabels.
- **Sincronização:** vários PCs, com detecção de conflito e cache offline.
- **Acesso:** ver é livre, sem login. Para lançar é preciso entrar com usuário e senha próprios, nos perfis Administrador, PCP e Visualizador. Funções de administrador: gerenciar usuários, importar backup, limpar histórico e sucata e restaurar o padrão.
- **Idioma:** interface em português do Brasil, com números no formato pt-BR (1.234,5 kg).
- **Abas:** Visão Geral, Máquinas & Carteira, Produção Semanal, Lançamentos & Metas e Controle de Sucata.

## Brand Commitments

- Nome: **Grande Aço**.
- A empresa tem **logo e cores oficiais**, que o dashboard deve seguir. O logo foi recebido como imagem na conversa em 2026-11-24 e as características abaixo saíram dele:
  - **Monograma "GA"** em azul-céu, com as letras G e A entrelaçadas.
  - **Nome "GRANDE AÇO"** em azul-grafite quase preto, numa tipografia display larga (extended), quadrada, de cantos arredondados e peso pesado.
  - **Assinatura "INDÚSTRIA DE AÇO"** em fonte mono, maiúscula e espaçada.
  - **Versão em selo:** fundo branco com anel azul-céu.
  - **Cores aproximadas, medidas a olho na imagem:** azul-céu ≈ #3DAEE9 e grafite ≈ #1A2129. Não há valores oficiais confirmados.
- **Pendente:** o arquivo vetorial ou PNG do logo dentro do projeto. O ideal é `assets/logo-grande-aco.svg` ou `.png`. Enquanto ele não chega, o dashboard não deve redesenhar o logo à mão.

## Evidence on Hand

- Dados reais de produção de 2026 já estão na planilha. O app traz dados de exemplo padrão de 2026.
- O logo existe só como imagem na conversa. O arquivo ainda não está no projeto.

## Product Principles

1. **A situação do mês em segundos:** meta, realizado, projeção e o que está atrasando aparecem antes de qualquer detalhe.
2. **Lançar sem errar:** formulários claros, conferências de valores fora do normal e confirmação de que o dado foi salvo na nuvem.
3. **Funcionar em qualquer tela:** do PC do PCP ao celular da gerência e à folha impressa da reunião.
4. **Números confiáveis:** totais por máquina, por semana e por carteira sempre batendo, com o histórico mostrando quem lançou o quê.
