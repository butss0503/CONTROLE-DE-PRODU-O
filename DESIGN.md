---
name: Grande Aço · Dashboard de Produção
description: Cada número é a etiqueta presa ao feixe de vergalhão — papel de etiqueta, faixa de lote, furo de amarração.
colors:
  ga-sky: "#3DAEE9"
  ga-sky-soft: "#D6EEFB"
  ga-sky-hover: "#63BFEE"
  ga-deep: "#0E6FA8"
  ga-ink: "#1A2129"
  ground: "#E3E7EB"
  stock: "#F7F7F4"
  field: "#FFFFFF"
  band: "#1A2129"
  band-line: "#3A4550"
  band-hover: "#2B3540"
  ink: "#1A2129"
  ink-2: "#36414C"
  mute: "#56616B"
  on-band: "#FFFFFF"
  on-band-mute: "#B7C1CA"
  line: "#C6CED5"
  line-soft: "#DEE3E7"
  neutral-chip: "#E2E8EE"
  ok: "#0E7A4F"
  ok-soft: "#DDF1E7"
  warn: "#A35F00"
  warn-soft: "#FBEBD3"
  bad: "#C42F2D"
  bad-soft: "#F8E0DF"
  bad-deep: "#A42624"
  chart-sky-1: "#A9D8F2"
  chart-sky-2: "#6EC1EE"
  chart-tick: "#4A5560"
  chart-track: "#E1E6EA"
typography:
  display:
    fontFamily: "Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(2.4rem, 4.2vw, 3.6rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 125"
  title:
    fontFamily: "Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.98rem"
    fontWeight: 800
    lineHeight: 1.2
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
    fontWeight: 800
    lineHeight: 1.35
    letterSpacing: "0.05em"
    fontVariation: "'wdth' 125"
  number-lg:
    fontFamily: "'JetBrains Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "clamp(1.5rem, 2.2vw, 1.95rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  number:
    fontFamily: "'JetBrains Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "1.32rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  number-sm:
    fontFamily: "'JetBrains Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "0.9rem"
    fontWeight: 800
    lineHeight: 1.3
rounded:
  meter: "2px"
  chip: "3px"
  item: "4px"
  tag: "6px"
  ctl: "6px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "18px"
  gutter: "28px"
  gutter-mobile: "14px"
components:
  button-primary:
    backgroundColor: "{colors.ga-ink}"
    textColor: "{colors.on-band}"
    typography: "{typography.body}"
    rounded: "{rounded.ctl}"
    padding: "10px 20px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.band-hover}"
  button-sky:
    backgroundColor: "{colors.ga-sky}"
    textColor: "{colors.ga-ink}"
    rounded: "{rounded.ctl}"
    padding: "10px 20px"
    height: "46px"
  button-sky-hover:
    backgroundColor: "{colors.ga-sky-hover}"
  button-outline:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
    padding: "5px 14px"
    height: "34px"
  button-outline-active:
    backgroundColor: "{colors.ga-ink}"
    textColor: "{colors.on-band}"
  button-delete:
    backgroundColor: "transparent"
    textColor: "{colors.bad}"
    rounded: "{rounded.ctl}"
    padding: "4px 10px"
  button-delete-hover:
    backgroundColor: "{colors.bad}"
    textColor: "{colors.field}"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
    padding: "9px 12px"
    height: "44px"
  tab:
    backgroundColor: "{colors.band}"
    textColor: "{colors.on-band-mute}"
    typography: "{typography.body}"
    padding: "0 14px"
    height: "60px"
  tab-active:
    textColor: "{colors.on-band}"
  tag-panel:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
  tag-band-graphite:
    backgroundColor: "{colors.band}"
    textColor: "{colors.on-band}"
    typography: "{typography.label}"
    padding: "8px 44px 8px 18px"
    height: "40px"
  tag-band-sky:
    backgroundColor: "{colors.ga-sky}"
    textColor: "{colors.ga-ink}"
    typography: "{typography.label}"
    padding: "6px 30px 6px 12px"
  chip-ok:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ok}"
    rounded: "{rounded.chip}"
    padding: "3px 8px"
  chip-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.chip}"
    padding: "3px 8px"
  chip-bad:
    backgroundColor: "{colors.bad-soft}"
    textColor: "{colors.bad}"
    rounded: "{rounded.chip}"
    padding: "3px 8px"
  badge-pill:
    backgroundColor: "{colors.field}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
---

# Design System: Grande Aço · Dashboard de Produção

## Overview

**Creative North Star: "Etiqueta do Feixe"**

Todo número do dashboard é a etiqueta amarrada ao feixe de vergalhão no pátio: um papel claro (`stock`), uma faixa de lote no topo e um furo de amarração no canto direito. Bitola, máquina, peso e carteira se leem como se lê a etiqueta de um feixe: o código grande na faixa, o peso logo abaixo, nada além do necessário. As etiquetas ficam sobre um chão de névoa de aço (`ground`), e a estrutura (barra superior, faixas de resumo, cabeçalhos de painel) é grafite.

A densidade é de chão de fábrica, não de apresentação: grades de etiquetas pequenas (mínimo de 158px por bitola), linhas tracejadas separando os campos da etiqueta e números em mono alinhados. Duas faixas fazem a hierarquia: a faixa **grafite** marca resumo e estrutura (cabeçalho de painel, etiqueta de resumo do mês, semana em destaque); a faixa **azul-céu** marca o dado por item (bitola, KPI). Os estados (ok, atenção, ruim) aparecem como pontos, tags pequenas e réguas, nunca como fundos de painel inteiros.

O mundo rejeita a grade escura de cartões KPI estilo SaaS (o visual anterior do projeto) e o painel administrativo branco com barra lateral.

**Key Characteristics:**
- Painéis são etiquetas: papel `stock`, faixa no topo, furo de amarração à direita, cantos de 6px.
- Faixa grafite = estrutura e resumo; faixa azul-céu = dado por item.
- Archivo larga (125%) para display, códigos de máquina e rótulos; JetBrains Mono para todo número medido.
- Linhas tracejadas separam os campos dentro da etiqueta e marcam o que é pendente ou esperado.
- Chão de névoa de aço, sombras curtas e baixas; nada flutua alto, exceto menus e janelas.

## Colors

Uma paleta de pátio de aço: grafite e azul-céu da marca, papel de etiqueta quente sobre névoa fria, e três estados industriais.

### Primary
- **Azul-Céu Grande Aço** (`ga-sky`): faixa de lote das etiquetas de dado (bitola, KPI), sublinhado da aba ativa, série "meta" nos gráficos, botão de entrar e botão secundário de ação. É a cor da marca; aparece em faixas e marcas, não em superfícies grandes.
- **Céu Claro** (`ga-sky-soft`): fundo de linha total em tabela, hover de item de menu, aviso de modo consulta, tag de dobradeira.
- **Céu Aceso** (`ga-sky-hover`): hover dos botões azul-céu.

### Secondary
- **Azul Profundo** (`ga-deep`): anel de foco, borda de campo em foco, cursor de texto, estado "pendente" da etiqueta de bitola, barras da dobradeira no gráfico. É o azul que carrega interação, porque o céu não tem contraste para texto sobre papel.

### Neutral
- **Grafite Feixe** (`ga-ink` / `band` / `ink`): barra superior, faixas de cabeçalho, botão primário, preenchimento da régua de meta, texto principal, série "produzido" nos gráficos. Os três nomes têm o mesmo valor e papéis diferentes: marca, faixa e texto.
- **Linha da Faixa** (`band-line`): bordas de filtros, chip de usuário e botões sobre fundo grafite.
- **Grafite Aceso** (`band-hover`): hover do botão primário.
- **Névoa de Aço** (`ground`): o chão da página, onde as etiquetas ficam; também a cor do furo de amarração.
- **Papel de Etiqueta** (`stock`): superfície de toda etiqueta, menu e janela.
- **Branco de Campo** (`field`): campos de digitação, pílulas, caixas de conferência. É mais branco que o papel, para o campo editável se destacar.
- **Grafite Médio** (`ink-2`): texto secundário, rótulos de formulário.
- **Cinza Rótulo** (`mute`): rótulos de campo de etiqueta, cabeçalhos de tabela, notas.
- **Sobre Faixa** (`on-band`) e **Sobre Faixa Suave** (`on-band-mute`): texto sobre grafite, ativo e inativo.
- **Linha** (`line`) e **Linha Suave** (`line-soft`): bordas de controles e tracejados (`line`); trilhos de réguas e divisores de tabela (`line-soft`).
- **Chip Neutro** (`neutral-chip`): tag de estribadeira, avatar e perfil "visualizador".

### Estados
- **Verde Ok** (`ok`, fundo `ok-soft`): carteira zerada, máquina disponível, salvo na nuvem, meta batida (a régua de meta fica verde).
- **Âmbar Atenção** (`warn`, fundo `warn-soft`): bitola não iniciada, marca tracejada do "esperado até hoje", modo local (não sincronizado), backlog pendente.
- **Vermelho Ruim** (`bad`, fundo `bad-soft`, hover `bad-deep`): excluir, máquina com mais de 8 h paradas, erros de formulário, usuário inativo.

### Gráficos
- Série principal "produzido": grafite `ga-ink` com preenchimento grafite a 7% de opacidade, linha em degrau.
- Série "meta/previsão": `ga-sky` tracejada (6/4).
- Sequência de semanas (claro → escuro): `chart-sky-1`, `chart-sky-2`, `ga-sky`, `ga-deep`, `ga-ink`.
- Estribadeira em `ga-ink`, dobradeira em `ga-deep`.
- Eixos e legendas em `chart-tick`; grade em grafite a 8% (`rgba(26,33,41,0.08)`); trilho de medidor em `chart-track`.
- Rótulos de dados: fundo `stock`, borda da cor da série, raio de 6px (uma mini-etiqueta), números em JetBrains Mono.

### Named Rules
**The Duas Faixas Rule.** Grafite marca estrutura e resumo; azul-céu marca o dado de cada item. Uma etiqueta tem uma faixa só, e a cor da faixa diz o tipo da etiqueta.

**The Céu Não É Texto Rule.** O azul-céu `ga-sky` nunca é cor de texto sobre papel; sobre o céu, o texto é sempre grafite `ga-ink`. Para link, foco e texto azul use `ga-deep`.

**The Estado em Ponto Rule.** Estados aparecem como ponto, tag pequena ou régua colorida. Nenhum painel inteiro é pintado de verde, âmbar ou vermelho.

## Typography

**Display Font:** Archivo larga, `font-stretch: 125%` (com system-ui)
**Body Font:** Archivo, largura normal (com system-ui, Segoe UI)
**Label/Mono Font:** JetBrains Mono (com ui-monospace, Cascadia Mono, Consolas), só para números

**Character:** A Archivo larga e pesada ecoa o nome "GRANDE AÇO" do logo: quadrada, industrial, em caixa alta nos rótulos. A JetBrains Mono é a régua de medição: todo peso, porcentagem, hora e valor em R$ sai nela, com algarismos de largura fixa para as colunas baterem.

### Hierarchy
- **Display** (`display`): o produzido do mês na etiqueta de resumo. É o único número em Archivo larga, assim como o valor da semana em destaque (`.featured`).
- **Headline** (`headline`): títulos de quadro ("Etiquetas por bitola") e o período na faixa de período, em caixa alta (de 1rem a 1,05rem).
- **Title** (`title`): nomes de máquina (ES02, EB10…) na lista de status e títulos de janela (1,1rem).
- **Body** (`body`): texto corrido e controles; formulários a 0,92rem, tabelas a 0,86rem; algarismos tabulares ligados na página inteira.
- **Label** (`label`): faixas de etiqueta, rótulos de campo (`dt`), cabeçalhos de tabela, rótulos de filtro e de menu, entre 0,7rem e 0,74rem, caixa alta, espaçamento de 0,05em.
- **Número grande** (`number-lg`): valores de KPI.
- **Número** (`number`): produzido por bitola.
- **Número pequeno** (`number-sm`): valores de linha de etiqueta (1,02rem), barras de máquina, totais de carteira, campos numéricos.

### Named Rules
**The Mono Mede Rule.** JetBrains Mono é só para o que foi medido ou codificado: kg, t, %, h, R$, datas. Palavras, rótulos e títulos nunca saem em mono; saem em Archivo larga em caixa alta.

**The Largura É Voz Rule.** A largura de 125% é reservada a display, códigos de máquina, faixas e rótulos. O texto corrido e os controles ficam na largura normal.

## Layout

A página é um pátio de etiquetas com margem lateral de 28px (14px no celular) e intervalos de 18px entre painéis. A Visão Geral abre com duas colunas: a etiqueta de resumo (de 320px a 400px) à esquerda e a grade de etiquetas por bitola (`auto-fill`, mínimo de 158px, intervalo de 12px) à direita, com as duas colunas terminando na mesma altura. Abaixo vem a grade principal em três colunas (1fr 1fr 1,2fr) e, depois, a inferior em duas.

Pontos de quebra: até 1280px a grade principal passa a ter duas colunas e o último painel ocupa a linha toda; até 1000px a Visão Geral empilha; até 760px tudo vai para uma coluna, as bitolas ficam em duas colunas, as abas rolam na horizontal e a barra superior deixa de ser fixa.

Ritmo interno: as etiquetas têm 18px de recuo lateral sob a faixa e 16px entre a faixa e o conteúdo; as linhas de etiqueta usam 11px de respiro com separador tracejado. Na impressão o fundo vira branco, as sombras e os furos somem, as etiquetas ganham borda de 1px em `line` e as faixas mantêm a cor (`print-color-adjust: exact`).

## Elevation & Depth

Sistema quase plano, com duas sombras de papel. As etiquetas ficam assentadas no chão com uma sombra curta e baixa, que é a de um papel sobre uma superfície e não a de um cartão flutuando. Só o que se abre por cima (menus, janelas, avisos) ganha a sombra alta. A profundidade de verdade vem do contraste entre os tons (`ground` e `stock`) e do furo de amarração, que é um recorte com sombra interna mostrando o chão por trás.

### Shadow Vocabulary
- **Sombra de etiqueta** (`box-shadow: 0 1px 2px rgba(26,33,41,0.14), 0 6px 16px rgba(26,33,41,0.07)`): toda etiqueta em repouso (painel, KPI, bitola).
- **Sombra de sobreposição** (`box-shadow: 0 2px 4px rgba(26,33,41,0.12), 0 18px 40px rgba(26,33,41,0.22)`): menus, janelas modais, avisos.
- **Furo de amarração** (`box-shadow: inset 0 1px 2px rgba(26,33,41,0.45), 0 0 0 2px rgba(255,255,255,0.18)`): o recorte circular no canto da etiqueta.

### Named Rules
**The Papel Assentado Rule.** Etiquetas nunca sobem no hover nem ganham sombra maior. Só o que se sobrepõe à página usa a sombra de sobreposição.

## Shapes

Cantos discretamente arredondados de 6px em etiquetas e controles, como o papel cortado de uma etiqueta de feixe. Tags de estado e de perfil usam 3px; itens de menu, 4px; réguas e trilhos, 2px, quase retos como uma régua de aço. O círculo aparece em três lugares só: o furo de amarração (13px no painel, 10px na bitola), os pontos de estado e o avatar. A pílula (999px) fica para o indicador de nuvem e o chip de usuário.

O tracejado é forma com significado: separadores internos da etiqueta, a marca do "esperado até hoje" (2px tracejado em `warn`), as caixas de conferência, o aviso de modo consulta e a pílula de modo local. Tracejado quer dizer "campo, esperado ou pendente"; linha cheia quer dizer "registrado".

### Named Rules
**The Tracejado Pendente Rule.** Tracejado para o que é previsto, pendente ou não salvo; linha cheia para o que já está gravado. A pílula de nuvem passa de tracejada (local) a cheia (online).

## Components

### Buttons
Firmes e retos, de oficina: sem gradiente, sem brilho.
- **Shape:** cantos de 6px (`ctl`).
- **Primary:** fundo grafite, texto branco, peso 700, altura mínima de 46px, largura total nos formulários de lançamento.
- **Hover / Focus:** grafite aceso no hover; desce 1px no clique; anel de foco de 2px em `ga-deep` com 2px de afastamento.
- **Sky:** fundo azul-céu e texto grafite, para ações ligadas à marca (entrar, ação secundária de destaque); no hover fica céu aceso.
- **Outline:** fundo `field`, borda `line`, 34px; no hover a borda fica grafite; quando ligado (toggle ativo) vira grafite cheio. Sobre faixa grafite fica transparente, com borda que acende em azul-céu.
- **Delete:** texto vermelho com borda rosada; no hover fica vermelho cheio com texto branco.

### Chips
- **Style:** tags retangulares de 3px, 0,7rem, peso 700: verde (`ok-soft`/`ok`), âmbar (`warn-soft`/`warn`), vermelho (`bad-soft`/`bad`), céu (`ga-sky-soft` com texto azul escuro) para dobradeira, neutro (`neutral-chip`) para estribadeira.
- **Perfil:** administrador em azul-céu cheio, PCP em verde suave, visualizador em neutro.
- **Pílula de nuvem:** fundo branco, ponto de 8px na cor do estado; borda cheia verde quando online e tracejada âmbar quando está em modo local.

### Cards / Containers
- **Corner Style:** 6px (`tag`).
- **Background:** papel `stock` sobre chão `ground`.
- **Shadow Strategy:** sombra de etiqueta (ver Elevation & Depth).
- **Border:** nenhuma em tela; 1px `line` só na impressão.
- **Internal Padding:** 18px nas laterais, 18px embaixo; a faixa vai de ponta a ponta, com 8px por 18px de recuo e 44px à direita para abrir espaço ao furo.

### Inputs / Fields
- **Style:** fundo branco `field`, borda de 1px `line`, 6px, altura mínima de 44px; os campos numéricos usam JetBrains Mono. Os rótulos ficam acima, em 0,78rem e peso 600, na cor `ink-2`.
- **Focus:** a borda passa a `ga-deep`, com halo de 3px em azul-céu a 28%.
- **Error:** caixa `bad-soft` com borda rosada e texto vermelho escuro acima das ações.
- **Filtros na faixa grafite:** campo transparente dentro de uma moldura de 1px `band-line`, com rótulo em caixa alta; a moldura acende em azul-céu no foco.

### Navigation
- Barra superior grafite com 60px, fixa no topo da tela (no celular rola com a página). Monograma GA em azul-céu, Archivo larga peso 900.
- Abas em texto `on-band-mute`, peso 600, 0,86rem; no hover e na aba ativa o texto fica branco, e a aba ativa ganha um sublinhado azul-céu de 3px que cresce do centro (0,25s, `cubic-bezier(0.16, 1, 0.3, 1)`).
- No celular as abas ocupam a linha inteira e rolam na horizontal, com 46px de altura.

### Etiqueta de Resumo (signature)
A etiqueta alta à esquerda da Visão Geral. Tem faixa grafite com "LOTE <MÊS / ANO>" e, quando a meta é batida, uma tag "Meta batida" em azul-céu. Mostra o produzido do mês em display e uma régua de meta de 12px (trilho `line-soft`, preenchimento grafite que fica verde ao bater a meta) com a marca tracejada âmbar do esperado até hoje. Depois vêm as linhas de etiqueta (projeção, disponibilidade, acumulado do ano), com o rótulo à esquerda, o valor em mono à direita e a nota abaixo, separadas por tracejado.

### Etiqueta de Bitola (signature)
Uma etiqueta pequena por bitola. A faixa azul-céu traz "Ø 8,00", com o Ø em Archivo larga 900, e as máquinas à direita, cortadas com reticências se não couberem. Abaixo vêm o produzido em mono 1,32rem, a linha "Carteira" com o valor e um medidor de 6px do quanto já foi atendido, e um ponto de estado no rodapé: verde para carteira zerada, azul profundo para atendimento parcial, âmbar para não iniciada e cinza para sem pedido. A etiqueta sem pedido troca a faixa para `line` e apaga o número.

### Etiqueta KPI
Faixa azul-céu com o rótulo em caixa alta e o valor em `number-lg`. A variante em destaque (`.featured`, a melhor semana) troca para faixa grafite e valor em Archivo larga.

### Tabelas
Cabeçalho em `label` cinza, sublinhado por uma régua grafite de 2px; linhas separadas por `line-soft`; hover de linha em azul-céu a 7%; linha de total em `ga-sky-soft` e peso 700.

## Do's and Don'ts

### Do:
- **Do** montar todo painel novo como etiqueta: papel `stock`, faixa de ponta a ponta no topo, furo de amarração no canto direito e cantos de 6px.
- **Do** usar faixa grafite para resumo e estrutura e faixa azul-céu para o dado de cada item (The Duas Faixas Rule).
- **Do** pôr todo número medido (kg, t, %, h, R$) em JetBrains Mono 800, no formato pt-BR (1.234,5 kg).
- **Do** escrever rótulos em Archivo larga (125%), caixa alta, entre 0,7rem e 0,74rem, com espaçamento de 0,05em.
- **Do** usar tracejado para o previsto, pendente ou não salvo e linha cheia para o registrado.
- **Do** manter o texto sobre azul-céu em grafite `ga-ink` e usar `ga-deep` para foco e texto azul.
- **Do** seguir a sequência dos gráficos: grafite para o realizado, céu tracejado para a meta e a rampa céu-claro → grafite para as semanas.

### Don't:
- **Don't** voltar à grade escura de cartões KPI estilo SaaS nem ao painel administrativo branco com barra lateral.
- **Don't** usar `ga-sky` como cor de texto sobre papel ou chão.
- **Don't** pintar um painel inteiro com cor de estado; o estado vai em ponto, tag ou régua.
- **Don't** escrever palavras ou títulos em mono; mono é só para números e códigos medidos.
- **Don't** fazer etiquetas subirem ou ganharem sombra maior no hover; a sombra de sobreposição é só para menus, janelas e avisos.
- **Don't** redesenhar o logo da Grande Aço à mão; o monograma em texto fica até o arquivo oficial chegar.
