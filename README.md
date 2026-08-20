# Vôlei 4x4

App para grupos que jogam vôlei de areia e perdem tempo montando time. O grupo
avalia os próprios jogadores, o app aprende o nível de cada um e sorteia dois
times de quatro que sejam de fato parelhos — com sorte suficiente para os times
não serem sempre os mesmos.

Roda no navegador, em qualquer celular ou computador. É feito para ser usado em
pé, na beira da quadra, com o celular na mão.

**Publicação:** [vercel.com/lucasriboldis-projects/volei4x4](https://vercel.com/lucasriboldis-projects/volei4x4)
— hoje o deploy ainda está atrás da autenticação da Vercel e sem as variáveis de
ambiente. Ver [Erros conhecidos](#-erros-conhecidos).

---

# Como usar

## Criar sua conta

Na primeira vez, toque em **Criar conta** e informe nome, e-mail e uma senha de
pelo menos 8 caracteres. Você entra direto, sem precisar confirmar e-mail.

## Perfil

A aba **Perfil** é onde você se apresenta ao grupo.

- **Foto** — toque no círculo com suas iniciais para escolher uma imagem do
  aparelho. Ela aparece nas listas e nos times sorteados.
- **Nome, apelido e cidade** — o apelido é o que aparece na tela de sorteio,
  onde o espaço é curto.
- **Sair da conta** fica no fim da tela.

Você só edita o seu próprio perfil. Ninguém mexe no seu.

## Jogadores

A aba **Jogadores** mostra todo mundo do grupo, com foto, apelido, cidade e a
nota geral de cada um.

- O número grande é o **rating**, de 0 a 10. O meio da escala é 5,0.
- Um traço (`–`) no lugar do número quer dizer **ainda não há avaliações
  suficientes**. Não é nota zero: é o app dizendo que ainda não sabe o
  bastante para arriscar um número.
- Abaixo aparece quantas pessoas já avaliaram aquele jogador.
- A busca filtra por nome ou apelido.

Quando você tem avaliações pendentes, um aviso aparece no topo desta aba.

## Sorteio

A aba **Sorteio** é onde a partida nasce.

1. Escolha o **modo**: *Equilíbrio* busca os times mais parelhos possíveis,
   *Variedade* aceita um pouco mais de diferença em troca de escalações
   diferentes a cada semana, e *Meio-termo* fica entre os dois.
2. Marque **exatamente 8 jogadores**. O contador no topo mostra quantos faltam,
   e o app não deixa passar de oito.
3. Toque em **Sortear times**.

O app não sorteia no acaso. Ele calcula todas as 35 formas possíveis de dividir
aqueles 8 jogadores em dois times de 4, mede a diferença de força de cada
divisão, separa as melhores e sorteia entre elas. Por isso os times ficam
parelhos e ainda assim mudam de uma semana para a outra.

Na tela de resultado você vê os dois times, a força estimada de cada um e a
diferença entre eles. **Sortear de novo** mantém as mesmas 8 pessoas e tenta
outra divisão.

**Registrar partida** grava aquele jogo — e é isso que libera as avaliações
depois.

## Avaliar depois da partida

Esta é a parte que faz o app melhorar com o tempo.

**Só quem jogou avalia, e só no dia seguinte.**

- No **dia da partida**, ninguém avalia. Nem quem jogou.
- Na **virada para o dia seguinte**, a avaliação abre para os 8 participantes.
- Na **virada seguinte**, fecha. O que foi salvo fica; nada mais entra.

A janela depende da **data** do jogo, não do horário. Uma partida às 8 da manhã
e outra às 22:30 do mesmo dia abrem para avaliação exatamente no mesmo momento.

Quando a janela abre, um aviso aparece na aba Jogadores. Você avalia cada
companheiro em oito características — ataque, defesa, passe, saque, bloqueio,
agilidade, leitura de jogo e trabalho em equipe —, de 1 a 5 estrelas.

Não precisa avaliar todo mundo. O que você salvar conta; o resto simplesmente
não entra. Enquanto a janela estiver aberta, dá para voltar e corrigir.

Você avalia **o desempenho naquela partida**, e não a pessoa em geral. Por isso
a mesma pessoa pode receber notas diferentes em jogos diferentes — e o rating é
a média de tudo isso.

## Partidas

O histórico mostra os jogos anteriores, com os times, o placar quando informado
e o estado da avaliação de cada um: *amanhã*, *aberta* ou *encerrada*.

## Ninguém descobre quem deu qual nota

Isso não é promessa da tela, é regra do banco de dados.

- Você lê **apenas as notas que você mesmo deu**.
- Ninguém lê as suas — nem a pessoa avaliada, nem o administrador.
- O que o grupo enxerga é a **média**, nunca o voto individual.
- Enquanto um jogador tem poucos avaliadores, o app mostra `–` em vez de um
  número. Com poucos votos, qualquer média entregaria quem votou o quê.

## Administrador

Uma conta pode ser marcada como administradora. Ela pode corrigir nome, apelido
e cidade de qualquer jogador — útil quando alguém digita errado no cadastro.

O administrador **não** vê avaliações, **não** troca a foto de outra pessoa e
**não** avalia fora da janela. Privilégio administrativo não é o mesmo que ver
tudo.

---

# Parte técnica

**Expo + React Native + Expo Router**, um código só para web, Android e iOS.
**Supabase** (Postgres) para banco e autenticação, no plano gratuito.

**O alvo hoje é a web, e só a web.** Toda etapa é desenvolvida e testada no
navegador. Ver [Virar app de celular depois](#virar-app-de-celular-depois) para
o porquê disso não fechar a porta.

O modelo do banco está desenhado em **[docs/mer.html](docs/mer.html)** — abra no
navegador. Traz as tabelas, as relações, quem pode ler e escrever o quê, e as
funções. É gerado por `scripts/gerar-mer.py`; para atualizar, edite o script e
rode de novo.

## Estado atual

Levantamento de 20/08/2026, conferido contra o banco, a interface e o deploy.
Nada aqui foi escrito de memória.

**No ar:** https://volei4x4.vercel.app

### Fases do projeto

| # | Fase | Situação |
|---|---|---|
| 01 | Estrutura, banco e autenticação | ✅ concluída e verificada |
| 02 | Perfil do jogador | ✅ concluída e verificada |
| 03 | Lista de jogadores e abas | ✅ concluída e verificada |
| 04 | Avaliações | ✅ substituída pela avaliação por partida |
| 05 | Rating | ✅ concluída e verificada com dado real |
| 06 | Motor de balanceamento | ✅ concluída, 11 testes |
| 07 | Partidas e sorteio | ✅ concluída e verificada |
| 08 | Avaliação pós-partida | ✅ concluída e verificada |
| — | Publicação na Vercel | ✅ no ar |
| — | Administrador | ✅ concluída e verificada |
| — | Avaliação inicial | ✅ concluída e verificada |
| 09 | Design system e interface | 🔶 fundação pronta; telas ainda não usam |
| 10 | Polimento, acessibilidade, responsividade | ⬜ não iniciada |

### ✅ Verificado na interface

| O que | O que foi observado |
|---|---|
| Cadastro, login e guarda de rota | entra; sem sessão volta ao login |
| Login em **produção** | passa em volei4x4.vercel.app |
| Perfil: nome, apelido, cidade | grava e relê |
| Lista de jogadores | 22 cadastrados, com rating e nº de avaliadores |
| Busca | filtra por nome e apelido |
| Aviso de avaliação pendente | "6 jogadores aguardam sua avaliação" |
| Tela de avaliar a partida | progresso, prazo, quem já foi avaliado |
| Sorteio | Time A × Time B com força e diferença |
| Moldura de 768px | centralizada em 1440; tela cheia em 360 e 768 |
| Sem rolagem horizontal | em 360, 768 e 1440 |

### ✅ Verificado pela API

Regra de banco, provada com requisição direta — é onde a garantia vive.

| O que | Resultado |
|---|---|
| Rating: ordenação | bate com o nível semeado (Spearman 0,984) |
| Rating: escala | 0–10, neutro em 5,0 |
| Piso de confiança | 13 de 22 passaram; o resto mostra `–` |
| Compressão bayesiana | altos −0,60, baixos +0,33 — como projetado |
| Registrar partida | 4×4 gravado, rating congelado |
| Escalação inválida | recusada com mensagem |
| Foto: envio | 200, e legível publicamente |
| **Foto: escrever na pasta alheia** | **403** |
| **Criar perfil com id alheio** | **403** |
| **Editar perfil alheio** | **0 linhas** |
| **Ler avaliação alheia** | **vazio, contagem 0** |
| **Avaliar a si mesmo** | **403** |
| **Avaliar quem não jogou a partida** | **403** |
| **Votar em nome de outra pessoa** | **403** |
| **Avaliar no dia da partida** | **403 — janela fechada** |
| **Avaliar 5 dias depois** | **403 — janela fechada** |
| Avaliação inicial | 201 |
| **Avaliação inicial repetida** | **409 — chave primária** |
| **Sobrescrever a inicial (upsert)** | **403 — sem grant de update** |
| Admin edita perfil alheio | 1 linha |
| **Usuário comum se promove a admin** | **403** |
| **Admin promove alguém pela API** | **403 — não há esse caminho** |
| **Admin lê avaliação alheia** | **vazio** |

### 🧪 Coberto por teste automatizado

61 testes, com `npm run teste`.

- **Motor de sorteio** (11) — as 35 divisões, força e diferença, recusa de
  quantidade ≠ 8, equilíbrio por modo, e o empate que travaria sem o epsilon.
- **Janela de avaliação** (8) — os cinco cenários do documento e as duas viradas
  exatas.
- **Contraste WCAG AA** (42) — cada par de cor dos dois temas, medido.

### 🔴 Erros conhecidos

Nenhum é emergencial: o app está no ar e utilizável. Em ordem de incômodo.

**1. As telas não usam o design system.**
`src/design/tokens.ts` existe e está coberto por teste, mas nenhuma tela o
consome — todas leem `src/constants/theme.ts`, a paleta escura antiga. É a
fase 09.

**2. `app.json` declara tema claro, telas continuam escuras.**
Consequência do item 1.

**3. Nada leva ao histórico.**
A rota `/partidas` funciona, mas nenhuma tela aponta para ela.

**4. Os 13 jogadores de demonstração estão sem foto.**
Foram semeados antes de o bucket existir. Basta rodar `python scripts/semear.py`
de novo — é idempotente.

**5. 🧑 A chave anon na Vercel está quebrada em linhas.**
O app funciona porque `src/lib/supabase.ts` limpa espaço em branco. Vale
corrigir mesmo assim: se alguém remover a limpeza sem saber por que ela existe,
o bug volta.

**6. Dados de teste no banco.**
22 jogadores, dos quais 13 são fictícios (`@volei4x4-teste.com`) e ~8 são contas
de teste minhas. 9 partidas e 224 avaliações semeadas. Reversível: ver
`scripts/semear-avaliacoes.py --desfazer`. 🧑 Apagar contas exige `service_role`.

**7. Bruno Carvalho está com cidade "Esteio".**
Resíduo do teste de edição por administrador.

**8. O gatilho de perfil pode não estar instalado.**
A `0013` tenta e tolera falha de privilégio. Se não instalou, contas criadas
fora do app só ganham perfil no primeiro acesso — o que funciona.

### 📋 Falta fazer

**Produto — pequeno e visível**
- Link para o histórico de partidas a partir de alguma aba
- Registrar o placar pela tela (o banco já aceita)
- Perfil público do jogador, com as características agregadas
- Indicador de quem venceu, no histórico
- Marcador de pendência na barra de navegação

**Fase 09 — design system nas telas**
- Componentes: `Button`, `Card`, `Badge`, `RatingStars`, `Skeleton`,
  `EmptyState`, `Toast`, `BalanceIndicator`, `TeamCard`, `PlayerCard`
- As nove telas refeitas sobre os tokens
- Animação do sorteio (0,8–1,5 s)
- Estados vazios e *skeletons* de carregamento

**Fase 10 — polimento**
- Layout de tablet e desktop além da moldura
- Acessibilidade: foco visível, navegação por teclado, *reduced motion*
- Testes em 360, 375, 390 e 414px

**Falta testar**
- Registrar partida, salvar avaliação e enviar foto **pela tela** (hoje
  verificados pela API)
- As telas `/admin` e `/editar/[jogador]`
- O fluxo completo de ponta a ponta em produção

## Publicar

O build da web é gerado por:

```bash
npm run build
```

Ele roda `expo export -p web`, que produz `dist/`, e em seguida
`scripts/finalizar-build.mjs`, que acrescenta ao `index.html` o que o Expo não
coloca: manifest de PWA, ícone do iOS, `viewport-fit=cover`, idioma e a cor de
fundo que evita o lampejo branco. O script confere o resultado e falha se algo
não entrou — build silenciosamente incompleto é pior que build quebrado.

O `vercel.json` já aponta para tudo isso: comando de build, `dist` como saída,
`npm ci` na instalação, e o *rewrite* que manda qualquer rota para o
`index.html` — sem ele, abrir `/perfil` direto daria 404, porque num SPA só
existe um arquivo de verdade.

Testado servindo o `dist/` localmente: a tela de login renderiza, o manifest
carrega e os ícones respondem.

🧑 **Falta só o que depende do painel da Vercel**: criar as duas variáveis de
ambiente e desligar a Deployment Protection.

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um projeto no [Supabase](https://supabase.com) e aplique as migrações de
   `supabase/migrations/`, em ordem crescente de nome, pelo SQL Editor do painel.

3. Copie `.env.example` para `.env.local` e preencha com a URL e a *anon key* do
   seu projeto:

   ```bash
   cp .env.example .env.local
   ```

   **Sem esse arquivo o app não sobe**: `src/lib/supabase.ts` lança já no
   import. A `service_role` nunca entra aí — ela ignora toda a RLS, que é a
   fronteira real dos dados.

4. Suba o servidor:

   ```bash
   npm run web
   ```

   Abra `http://localhost:8081`. A primeira compilação leva algo como meio
   minuto; depois é imediata.

## Dados de demonstração

Para encher o banco com jogadores fictícios durante o desenvolvimento:

```bash
python scripts/gerar-avatares.py
python scripts/semear.py
```

Todos ficam sob o domínio `@volei4x4-teste.com`, para nunca serem confundidos
com pessoas reais. Os avatares são gerados — círculo colorido com iniciais —, e
não fotos de gente de verdade.

## Virar app de celular depois

O projeto é Expo, então o mesmo código que roda no navegador gera aplicativo
Android e iOS — `npm run android` e `npm run ios` já estão no `package.json`.
Não há migração a fazer no dia em que isso for desejado.

Para que continue assim, vale **uma regra**: só usar bibliotecas que existam
dentro do Expo Go. Assim que entrar um pacote com código nativo próprio, esse
caminho barato acaba: passa a ser necessário um *development build*, e o iOS
exige o Apple Developer Program (US$ 99/ano).

## Antes de commitar

```bash
npx tsc --noEmit
npm run teste
```

**O `tsc` precisa que o servidor tenha rodado pelo menos uma vez.** Os tipos
gerados — `expo-env.d.ts` e `.expo/types/` — nascem do `npx expo start` e estão
no `.gitignore`. Em árvore recém-clonada, antes disso, o `tsc` acusa rota
inexistente. O mesmo vale ao criar uma rota nova: reinicie o servidor.

## Onde fica cada coisa

| Caminho | O que tem |
|---|---|
| `src/app/` | Rotas, e só rotas — telas e layout do expo-router |
| `src/nucleo/` | Regra pura e testável: atributos, sorteio, janela de avaliação |
| `src/lib/` | Conversa com o Supabase: auth, jogadores, partidas, avaliações |
| `src/components/` | Componentes de interface reaproveitados |
| `src/contexts/` | Sessão de autenticação |
| `src/constants/` | Paleta e espaçamentos |
| `scripts/` | Semeadura de dados de demonstração |
| `supabase/migrations/` | Esquema, RLS e funções — aplicadas à mão |

`src/nucleo/` é a parte que não depende de React nem de rede. O motor de
balanceamento e a regra da janela de avaliação vivem lá justamente para poderem
ser testados sozinhos, sem subir o app.

## Decisões que valem saber

**As regras de autorização vivem no banco, não na tela.** Quem pode avaliar
quem, quando, e quem pode editar qual perfil é decidido por policies de RLS.
Interface escondida não protege nada — um `curl` com a chave pública bateria na
mesma parede.

**O rating nunca é gravado.** É sempre calculado a partir das avaliações. Os
pesos das oito características vivem em `supabase/migrations/0007_rating.sql`,
e não no TypeScript: peso no cliente seria peso forjável.

**A janela de avaliação é gravada na criação da partida**, não calculada na
hora, e não depende de cron. Se está aberta é uma comparação entre o instante
atual e os dois marcos gravados, feita pelo servidor.

**A web roda como SPA** (`web.output: "single"`). O app inteiro fica atrás de
login: não há o que um render de servidor entregar.

**Não existe script de lint.** O `expo lint` do template não tem eslint como
dependência: ao rodar, grava as dependências no `package.json` sem tocar no
lockfile, e isso quebra o `npm ci`.

## Convenções

Código e comentários em português, sem acento em identificador. Comentário
explica **por que**, não o que o código já diz. Rotas em `src/app`, resto em
`src/`.
