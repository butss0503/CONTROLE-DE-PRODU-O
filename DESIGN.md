---
name: Grande Aço · Dashboard de Produção
description: Sala de controle escura da produção de vergalhão, com o azul-céu da Grande Aço como a única luz do painel.
colors:
  ga-sky: "#3DAEE9"
  ga-sky-hi: "#7CC9F0"
  ga-sky-deep: "#1E5A7C"
  ga-sky-glow: "rgba(61, 174, 233, 0.35)"
  ga-sky-soft: "rgba(61, 174, 233, 0.12)"
  on-sky: "#04131C"
  bg: "#07090C"
  surface: "#0E1217"
  surface-2: "#151B22"
  surface-3: "#1C242D"
  text: "#E8EDF2"
  text-2: "#B9C4CE"
  mute: "#8E9BA8"
  white: "#FFFFFF"
  line: "rgba(255, 255, 255, 0.08)"
  line-strong: "rgba(255, 255, 255, 0.16)"
  ok: "#34D399"
  ok-soft: "rgba(52, 211, 153, 0.14)"
  warn: "#FBBF24"
  warn-soft: "rgba(251, 191, 36, 0.14)"
  bad: "#F87171"
  bad-soft: "rgba(248, 113, 113, 0.14)"
  bad-solid: "#C23B3B"
  chart-goal: "#DDE6EE"
  chart-week-2: "#2678A6"
  chart-week-5: "#C4E8FA"
  chart-dobra: "#8FD3F5"
  chart-grid: "rgba(255, 255, 255, 0.07)"
  chart-label-bg: "#0B0F14"
typography:
  display:
    fontFamily: "Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(2.2rem, 3.4vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "0.02em"
    fontVariation: "'wdth' 125"
  title:
    fontFamily: "Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.82rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 125"
  body:
    fontFamily: "Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum' 1"
  label:
    fontFamily: "Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 125"
  number-lg:
    fontFamily: "'JetBrains Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "clamp(1.5rem, 2.2vw, 1.9rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  number:
    fontFamily: "'JetBrains Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "0.92rem"
    fontWeight: 800
    lineHeight: 1.5
  number-sm:
    fontFamily: "'JetBrains Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "0.86rem"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  item: "8px"
  ctl: "10px"
  menu: "12px"
  card: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  panel: "22px"
  gutter: "28px"
  gutter-mobile: "14px"
components:
  button-primary:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
    padding: "10px 22px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.white}"
  button-sky:
    backgroundColor: "{colors.ga-sky}"
    textColor: "{colors.on-sky}"
    rounded: "{rounded.pill}"
    padding: "10px 22px"
    height: "46px"
  button-sky-hover:
    backgroundColor: "{colors.ga-sky-hi}"
  button-outline:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "5px 14px"
    height: "34px"
  button-outline-active:
    backgroundColor: "{colors.ga-sky}"
    textColor: "{colors.on-sky}"
  button-delete:
    backgroundColor: "transparent"
    textColor: "{colors.bad}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  button-delete-hover:
    backgroundColor: "{colors.bad-solid}"
    textColor: "{colors.white}"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.ctl}"
    padding: "10px 14px"
    height: "46px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.mute}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  tab-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
  tab-active:
    backgroundColor: "{colors.ga-sky}"
    textColor: "{colors.on-sky}"
  nav-tabs:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "5px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "20px 22px 22px"
  kpi-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "18px 20px"
  kpi-card-featured:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.display}"
    rounded: "{rounded.card}"
    padding: "18px 20px"
  filter-group:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.ctl}"
    padding: "6px 12px"
  chip-ok:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ok}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  chip-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  chip-bad:
    backgroundColor: "{colors.bad-soft}"
    textColor: "{colors.bad}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  chip-sky:
    backgroundColor: "{colors.ga-sky-soft}"
    textColor: "{colors.ga-sky-hi}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  badge-pill:
    backgroundColor: "{colors.surface-2}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  menu-panel:
    backgroundColor: "{colors.surface-2}"
    rounded: "{rounded.menu}"
    padding: "6px"
  modal:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "22px 24px"
    width: "460px"
---

# Design System: Grande Aço · Dashboard de Produção

## Overview

**Creative North Star: "A Sala de Controle"**

O dashboard é a sala de controle da usina à noite: um chão preto (`bg`) com um brilho azul-céu fraco vindo do canto superior direito, painéis escuros em camadas e uma única fonte de luz, o azul-céu da Grande Aço. Essa luz acende só no que está vivo ou no que importa agora: a aba ativa, o cartão em destaque do mês, as réguas de progresso, os pontos de estado e o selo da marca. O resto fica apagado e legível, em cinza-claro sobre grafite.

A densidade é a de um painel de operação, não de uma apresentação. Uma faixa de quatro KPIs abre a Visão Geral, com o produzido do mês maior e iluminado; logo abaixo vêm dois gráficos lado a lado e, depois, a operação: a lista de máquinas e a tabela de bitolas, com produzido, carteira atendida e situação em linhas finas. Os títulos e rótulos saem em Archivo larga, em caixa alta; todo número medido sai em JetBrains Mono, com algarismos alinhados.

O brilho azul é uma assinatura pedida pelo cliente ("mais futurista") e faz parte do sistema, não é enfeite. O mundo claro anterior, de etiquetas de feixe em papel, foi rejeitado pelo cliente por "parecer um calendário" e não volta.

**Key Characteristics:**
- Chão preto com brilho radial azul-céu no topo direito; superfícies em três degraus de grafite.
- Uma luz só: azul-céu com brilho (glow) na aba ativa, no cartão em destaque, nas réguas, nos pontos de estado e no selo.
- Cartões de 16px com borda fina (hairline) de 1px e um leve reflexo no topo; controles em pílula.
- Archivo larga (125%) em caixa alta para títulos e rótulos; JetBrains Mono para todo número medido.
- Estados em verde, âmbar e vermelho claros, sempre como ponto, tag, régua ou borda.

## Colors

Uma paleta de sala escura: grafites frios em degraus, texto quase branco e o azul-céu da marca como luz, com três cores de estado claras o bastante para ler sobre o preto.

### Primary
- **Azul-Céu Grande Aço** (`ga-sky`): aba ativa, botão de entrar e botão de destaque, série "produzido" nos gráficos, ponto antes de cada título de painel, preenchimento das réguas e dos medidores de bitola, anel de foco, borda de campo em foco, cursor de texto, seleção de texto e toggle ligado.
- **Céu Aceso** (`ga-sky-hi`): hover dos botões azul-céu, rótulo do cartão em destaque, estado "atendimento parcial" das bitolas, texto das tags azuis e quarto degrau das semanas.
- **Céu Profundo** (`ga-sky-deep`): início do degradê das réguas de progresso (do céu profundo ao céu) e primeira semana no gráfico semanal.
- **Brilho do Céu** (`ga-sky-glow`): a cor de todo brilho azul (aba ativa, botão de entrar, réguas, selo).
- **Véu do Céu** (`ga-sky-soft`): fundo de linha total em tabela, aviso de modo consulta e tag de estribadeira.
- **Tinta sobre Céu** (`on-sky`): o texto que vai sobre qualquer preenchimento azul-céu.

### Neutral
- **Chão Noturno** (`bg`): o fundo da página e o fundo dos campos de digitação, mais escuros que o cartão para o campo parecer um recorte.
- **Painel** (`surface`): cartões, KPIs, faixa de período, trilho das abas, filtros, janelas.
- **Painel Elevado** (`surface-2`): menus, botões outline, pílula de nuvem, cabeçalho de tabela, aviso rápido, hover de aba.
- **Painel Fundo** (`surface-3`): trilhos de régua e medidor, avatar neutro, hover de item de menu.
- **Texto** (`text`): texto principal; também o fundo do botão primário (claro sobre o escuro).
- **Texto Secundário** (`text-2`): nomes de máquina na tabela de bitolas, rótulos de formulário, mensagens de janela.
- **Cinza Rótulo** (`mute`): rótulos de KPI, cabeçalhos de tabela, abas inativas, notas e eixos dos gráficos.
- **Linha** (`line`) e **Linha Forte** (`line-strong`): bordas finas de cartões e divisores de linha (`line`); bordas de controles, janelas e menus (`line-strong`).

### Estados
- **Verde Ok** (`ok`, fundo `ok-soft`): carteira zerada, nuvem online, meta batida (a régua e a borda do cartão ficam verdes), tag "Meta batida", perfil PCP.
- **Âmbar Atenção** (`warn`, fundo `warn-soft`): bitola não iniciada, marca tracejada do "esperado até hoje", modo local, tag de dobradeira, usuário pendente.
- **Vermelho Ruim** (`bad`, fundo `bad-soft`, cheio `bad-solid`): excluir, máquina com muitas horas paradas, erro de formulário, usuário inativo. O vermelho cheio aparece só no hover de excluir e no botão de confirmação perigosa.

### Gráficos
- **Produzido:** linha `ga-sky` de 2,5px em degrau, com preenchimento azul-céu a 16%.
- **Meta:** linha `chart-goal` tracejada (6/4).
- **Semanas:** rampa do escuro ao claro: `ga-sky-deep`, `chart-week-2`, `ga-sky`, `ga-sky-hi`, `chart-week-5`.
- **Máquinas:** estribadeira em `ga-sky`, dobradeira em `chart-dobra`.
- **Eixos e grade:** rótulos em `mute`; grade em `chart-grid`; barras com cantos de 6px.
- **Rótulos de dados:** texto `text` sobre `chart-label-bg`, borda da cor da série, cantos de 6px, JetBrains Mono 700 a 10px; valores grandes em forma curta ("30,7 mil"). No gráfico anual, quando ele tem menos de 520px de largura, só o mês ativo mostra o rótulo.

### Named Rules
**The Uma Luz Rule.** O azul-céu é a única fonte de luz. O brilho (glow) vai só na aba ativa, no cartão em destaque, nas réguas e medidores, nos pontos de estado, no botão de entrar e no selo. Um cartão comum nunca brilha, e cada faixa de KPIs tem um único cartão em destaque.

**The Tinta sobre Céu Rule.** Sobre preenchimento azul-céu o texto é sempre `on-sky`, nunca branco. Sobre o escuro, o céu pode ser texto (`ga-sky-hi` em rótulos e tags).

**The Estado em Ponto Rule.** Verde, âmbar e vermelho aparecem como ponto com brilho, tag em pílula, régua ou borda. Nenhum painel é pintado inteiro com cor de estado.

## Typography

**Display Font:** Archivo larga, `font-stretch: 125%` (com system-ui, Segoe UI)
**Body Font:** Archivo, largura normal (com system-ui, Segoe UI)
**Label/Mono Font:** JetBrains Mono (com ui-monospace, Cascadia Mono, Consolas), só para números

**Character:** A Archivo larga e pesada, em caixa alta, dá o tom industrial do nome "GRANDE AÇO". A JetBrains Mono funciona como instrumento de medida: todo peso, porcentagem, hora e valor em R$ sai nela, com algarismos de largura fixa para as colunas baterem. A página inteira usa algarismos tabulares.

### Hierarchy
- **Display** (`display`): só o produzido do mês no cartão em destaque. É o único número grande em Archivo larga.
- **Headline** (`headline`): nome "Grande Aço" na barra superior e período na faixa de período, em caixa alta. Títulos de janela usam a mesma Archivo larga 800, a 1,1rem, sem caixa alta.
- **Title** (`title`): títulos de painel em caixa alta, precedidos de um ponto azul-céu com brilho.
- **Body** (`body`): texto corrido e controles; formulários a 0,92rem, tabelas e linhas de bitola a 0,86rem, abas a 0,84rem peso 600.
- **Label** (`label`): rótulos de KPI, cabeçalhos de tabela e da lista de bitolas, rótulos de filtro e de menu, entre 0,7rem e 0,72rem, caixa alta, espaçamento de 0,06em a 0,08em.
- **Número grande** (`number-lg`): valores dos KPIs comuns.
- **Número** (`number`): totais por máquina.
- **Número pequeno** (`number-sm`): produzido e restante por bitola, valores de tabela, campos numéricos, datas da faixa de período.

### Named Rules
**The Mono Mede Rule.** JetBrains Mono é só para o que foi medido: kg, t, %, h, R$ e datas. Palavras, rótulos e títulos nunca saem em mono. A única exceção é o produzido do mês, que sai em Archivo larga para ser o número principal da tela.

**The Largura É Voz Rule.** A largura de 125% fica para títulos, rótulos, nomes de máquina, códigos de bitola e o número em destaque. Texto corrido, abas e controles ficam na largura normal.

## Layout

A página tem margem lateral de 28px (14px no celular) e intervalos de 16px entre cartões. A barra superior é fixa, translúcida (`bg` a 80% com desfoque de 12px) e traz, em linha, o selo, as abas em pílula, os filtros e o usuário; abaixo dela fica a faixa de período, com o mês ativo e as ações de nuvem.

A Visão Geral tem três faixas. A primeira é a de KPIs, em quatro colunas (1,5fr e três de 1fr), com o cartão em destaque à esquerda. A segunda traz os gráficos lado a lado (1,6fr e 1fr): mês a mês contra a meta e produção semanal, em quadros de 300px de altura. A terceira é a operação (1fr e 1,6fr): a lista de máquinas e a tabela de bitolas, em seis colunas (bitola, máquina, produzido, medidor de carteira atendida, restante e situação). As outras abas usam grades de três colunas (1,3fr, 0,95fr e 1fr) e de duas.

Pontos de quebra: até 1280px os KPIs passam a duas colunas; até 1100px gráficos e operação empilham; até 760px a barra superior deixa de ser fixa, as abas rolam na horizontal na linha inteira, o filtro de data some, o cartão em destaque e o último KPI ocupam a linha toda, os gráficos descem para 260px e cada linha de bitola mostra só bitola, produzido e situação, com o medidor numa segunda linha.

Os cartões têm de 18px a 22px de recuo interno; as linhas de lista usam de 9px a 11px de respiro, separadas por `line`. Na impressão o fundo vira branco, o texto preto e os cartões ganham borda cinza de 1px, sem brilho.

## Elevation & Depth

O sistema é plano e em camadas. A profundidade vem dos três degraus de grafite (`surface`, `surface-2`, `surface-3`) sobre o chão `bg`, das bordas finas de 1px e de um reflexo de 2,5% de branco no topo de cada cartão. Sombras escuras existem só para o que se abre por cima da página. O brilho azul não é elevação: é luz, e marca o que está ativo.

### Shadow Vocabulary
- **Sombra de sobreposição** (`box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6)`): janelas, menus e avisos rápidos.
- **Brilho de destaque** (`box-shadow: 0 0 0 1px rgba(61, 174, 233, 0.08), 0 10px 40px rgba(61, 174, 233, 0.10)`): só o cartão em destaque, junto com a borda azul a 45% e um brilho radial no canto superior esquerdo.
- **Brilho ativo** (`box-shadow: 0 0 18px var(--ga-sky-glow)`): aba ativa, botão de entrar e selo da barra (24px no selo do login).
- **Brilho de medida** (`box-shadow: 0 0 10px var(--ga-sky-glow)`): réguas de progresso (12px na régua da meta, 8px nos medidores de bitola).
- **Brilho de ponto** (`box-shadow: 0 0 8px currentColor`): pontos de estado e da pílula de nuvem, na cor do próprio estado.
- **Halo de foco** (`box-shadow: 0 0 0 3px rgba(61, 174, 233, 0.22)`): campos em foco.

### Named Rules
**The Plano com Luz Rule.** Cartões ficam planos e não sobem no hover. A sombra escura é só para o que se sobrepõe à página, e o brilho azul é só para o que está ativo ou medindo.

## Shapes

São duas formas. Contêineres (cartões, faixa de período, janelas, aviso de modo consulta) têm cantos generosos de 16px; menus e linhas de usuário, 12px; campos e filtros, 10px; itens de menu, 8px. Tudo o que é controle ou marca pequena é pílula (999px): abas e o trilho das abas, botões, tags, pílula de nuvem, chip de usuário, réguas e medidores. O círculo aparece no selo da marca, nos avatares, nos botões de ano e nos pontos de estado de 7px a 8px.

As bordas são sempre finas (1px), e o tracejado tem um único uso: a marca âmbar do "esperado até hoje" na régua da meta e na legenda, e a linha de meta nos gráficos.

### Named Rules
**The Pílula É Controle Rule.** O que se clica ou o que mede é pílula; o que contém é cartão de 16px. Não há cantos retos na interface.

## Components

### Buttons
Pílulas firmes, com o brilho reservado à ação de marca.
- **Shape:** pílula (999px).
- **Primary:** fundo claro `text`, texto `bg`, peso 700, altura mínima de 46px e largura total nos formulários; fica branco no hover e desce 1px no clique.
- **Sky:** fundo azul-céu e texto `on-sky`; no hover fica céu aceso e ganha brilho de 20px. O botão de entrar é a mesma pílula, a 40px, já com brilho em repouso.
- **Outline:** fundo `surface-2`, borda `line-strong`, 34px, 0,78rem peso 600; no hover a borda fica azul-céu; ligado (toggle) vira azul-céu cheio.
- **Delete:** texto `bad` com borda vermelha a 45%; no hover fica `bad-solid` cheio com texto branco.
- **Focus:** contorno de 2px em azul-céu com 2px de afastamento, em todo elemento focável.

### Chips
- **Style:** pílulas de 0,72rem peso 700: verde (`ok-soft`/`ok`), âmbar (`warn-soft`/`warn`), vermelho (`bad-soft`/`bad`) e céu (`ga-sky-soft`/`ga-sky-hi`).
- **Perfil:** administrador em azul-céu cheio com texto `on-sky`, PCP em verde suave, visualizador em `surface-3`.
- **Pílula de nuvem:** fundo `surface-2` com ponto de 8px brilhando na cor do estado; borda verde quando online e âmbar em modo local.

### Cards / Containers
- **Corner Style:** 16px (`card`).
- **Background:** `surface`, com reflexo branco de 2,5% nos primeiros 40% da altura.
- **Shadow Strategy:** nenhuma em repouso (ver Elevation & Depth).
- **Border:** 1px `line`; verde a 60% quando a meta é batida.
- **Internal Padding:** 20px a 22px nos painéis e 18px a 20px nos KPIs.
- **Título de painel:** `title` em caixa alta com um ponto azul-céu de 7px brilhando antes do texto.

### Inputs / Fields
- **Style:** fundo `bg`, borda de 1px `line-strong`, cantos de 10px, altura mínima de 46px; os campos numéricos usam JetBrains Mono. Os rótulos ficam acima, a 0,78rem peso 600 em `text-2`.
- **Focus:** a borda fica azul-céu, com halo de 3px a 22%.
- **Error:** caixa `bad-soft` com borda vermelha a 45% e texto rosado acima das ações.
- **Filtros da barra:** moldura `surface` de 10px com rótulo em caixa alta e campo transparente; a moldura acende em azul-céu no foco.

### Navigation
- Barra superior fixa e translúcida, com o selo de 44px (branco, com anel de 1px e brilho azul de 18px), o nome "Grande Aço" em `headline` e a linha "Produção · PCP · Sucata" em rótulo.
- Abas em pílula dentro de um trilho `surface` com 5px de recuo: inativas em `mute`, peso 600, 0,84rem; no hover ganham `surface-2`; a ativa fica azul-céu cheio, com texto `on-sky` e brilho de 18px. As transições levam 0,18s.
- No celular as abas ocupam a linha inteira e rolam na horizontal, e o subtítulo da marca some.

### Cartão em Destaque (signature)
O primeiro cartão da faixa de KPIs, mais largo (1,5fr). Tem borda azul-céu a 45%, brilho radial azul no canto superior esquerdo e brilho de destaque. O rótulo sai em `ga-sky-hi`, com a tag "Meta batida" à direita quando a meta é alcançada. O produzido do mês sai em `display`. Abaixo vem a régua da meta: trilho `surface-3` de 8px, preenchimento em degradê do céu profundo ao céu com brilho (verde quando a meta é batida) e a marca tracejada âmbar do esperado até hoje. Por fim, o atingimento em mono e a legenda.

### Lista de Bitolas (signature)
Uma tabela em linhas finas, uma linha por bitola: o código em Archivo larga 800; as máquinas em `text-2`, cortadas com reticências; o produzido e o restante em mono, alinhados à direita; um medidor em pílula de 6px com o quanto da carteira já foi atendido (céu com brilho, verde quando zerada); e a situação com um ponto brilhante: verde para "Carteira zerada", céu aceso para "% atendido", âmbar para "Não iniciada" e cinza para "Sem pedido" (que também apaga o número). No hover a linha recebe um véu azul a 5%. A lista de máquinas segue a mesma lógica: nome, tag de disponibilidade, régua com brilho e total em mono.

### Tabelas
Cabeçalho em `label` cinza sobre `surface-2`, com cantos superiores de 10px e borda `line-strong`; linhas separadas por `line`; hover de linha em azul a 5%; linha de total em `ga-sky-soft` e peso 700.

### Janelas
`surface` com borda `line-strong`, 16px, sombra de sobreposição, até 460px de largura, sobre um véu preto a 70% com desfoque. A janela de login centraliza o selo de 84px com brilho azul de 24px, o título e as ações empilhadas em largura total.

## Do's and Don'ts

### Do:
- **Do** manter o chão `bg` com o brilho radial azul no topo direito e montar todo cartão novo em `surface`, com borda de 1px `line` e cantos de 16px.
- **Do** usar o brilho azul-céu só no que está ativo, medindo ou em destaque (The Uma Luz Rule), com um único cartão em destaque por faixa.
- **Do** pôr todo número medido (kg, t, %, h, R$) em JetBrains Mono, no formato pt-BR (1.234,5 kg), e usar a forma curta ("30,7 mil") nos rótulos de gráfico.
- **Do** escrever títulos e rótulos em Archivo larga (125%), caixa alta, com espaçamento de 0,06em.
- **Do** usar `on-sky` como texto sobre qualquer preenchimento azul-céu.
- **Do** fazer de todo controle uma pílula e de todo contêiner um cartão de 16px.
- **Do** seguir a paleta dos gráficos: céu para o produzido, claro tracejado para a meta e a rampa do céu profundo ao céu claro para as semanas.
- **Do** usar o selo oficial (`assets/logo-grande-aco-selo.jpg`) em círculo branco, a 44px na barra e a 84px no login, sempre com o brilho azul.

### Don't:
- **Don't** voltar ao mundo claro de etiquetas de papel; o cliente o rejeitou por "parecer um calendário".
- **Don't** dar brilho a cartões comuns, títulos ou texto; o brilho é a luz do que está ativo, não decoração.
- **Don't** pintar um painel inteiro com cor de estado; o estado vai em ponto, tag, régua ou borda.
- **Don't** escrever palavras ou títulos em mono.
- **Don't** pôr texto branco sobre azul-céu.
- **Don't** fazer cartões subirem ou ganharem sombra no hover; a sombra escura é só para janelas, menus e avisos.
- **Don't** redesenhar ou recolorir o selo da Grande Aço.
