# Decisões

O que já foi decidido, e por quê -- para não redecidir. Decisão revertida não é
apagada: fica marcada como revertida, com o motivo, que é o que impede a volta
silenciosa de uma ideia já descartada.

O estado do projeto não mora aqui: está em [estado.md](estado.md). O que já
custou caro está em [armadilhas.md](armadilhas.md).

## Decisões fechadas

**O alvo e a web, e so a web -- mas continua sendo Expo.** Toda etapa e feita e
testada no navegador; celular nao entra no criterio de pronto de nenhuma delas.

A stack continua sendo Expo, e nao Vite ou Next, justamente para essa decisao
ser reversivel de graca: `npm run android` e `npm run ios` seguem no
`package.json` e continuam funcionando. Trocar para web puro daria uma interface
um pouco melhor hoje, ao custo de reescrever tudo no dia em que quisermos app --
e o pedido foi explicitamente manter essa porta aberta.

**A regra que mantem a porta aberta: so usar biblioteca que exista dentro do
Expo Go.** Enquanto ela valer, rodar no celular e instalar o Expo Go e ler um QR
Code -- sem build, sem loja, sem custo. O primeiro pacote com codigo nativo
proprio acaba com isso: passa a exigir development build, e o iOS passa a exigir
o Apple Developer Program, US$ 99/ano. Antes de acrescentar dependencia, conferir
se ela roda no Expo Go.

**A autoavaliacao saiu do produto.** O perfil nao pede mais que a pessoa se
pontue. A tabela `autoavaliacoes` continua no banco, vazia e sem custo, caso a
ideia volte -- o que faltaria seria a tela, nao o esquema.

A consequencia real esta na etapa 05: jogador sem avaliacao nenhuma passa a cair
no valor neutro, e nao no proprio palpite. Tende a ser melhor, porque
autoavaliacao e enviesada, mas e mudanca de premissa e nao detalhe de tela.

**A foto e publica para leitura.** O bucket `avatares` e publico porque a imagem
aparece em listas com dezenas de fotos, e URL assinada por foto custaria uma ida
ao servidor cada. O que tem regra e a escrita: o caminho e `<uid>/avatar.<ext>`,
e a policy do Storage exige que a primeira pasta seja o uid de quem envia.

**Icone e emoji, nao biblioteca.** Biblioteca de icones costuma trazer fonte ou
modulo nativo, e isso quebraria a regra do Expo Go. Emoji renderiza igual nos
tres alvos, sem dependencia.

**A avaliacao passa a ser por partida, nao global.** A etapa 04 entregou
avaliacao livre: qualquer um avalia qualquer um, a qualquer hora, corrigindo
para sempre. O modulo de avaliacao pos-partida substitui essa regra -- so avalia
quem jogou com voce, so no dia seguinte, e a janela fecha em 24h. As chaves sao
incompativeis: `(avaliador, avaliado)` contra `(partida, avaliador, avaliado)`.

A nota deixa de ser opiniao solta e passa a ser observacao de desempenho numa
partida concreta, que e o que o rating precisa. O custo e que quem nunca jogou
fica sem rating ate a primeira partida.

**Os pesos do rating vivem no SQL, nao no TypeScript.** Reverte uma decisao
anterior. O rating precisa ser calculado no banco de qualquer forma, porque
`avaliacoes` so devolve as linhas de quem pergunta -- o app nao consegue somar
voto alheio. E peso no cliente e peso forjavel. Manter nos dois lugares seria
pior que escolher um: divergiriam em silencio. O custo e que mudar peso pede
migracao; em troca, fica versionado.

**O motor de sorteio nao sabe o que e React nem rede.** `src/nucleo/sorteio.ts`
recebe jogadores com rating e devolve dois times. A fonte de aleatoriedade e
injetavel, o que torna o teste deterministico -- e por isso da para provar que o
modo rigoroso nunca e pior que o solto, em vez de torcer.

**A avaliacao inicial existe para o grupo arrancar.** Com so a pos-partida,
ninguem tem rating ate jogar, e o sorteio precisa de rating -- a primeira
partida sairia no acaso. Cada pessoa pode avaliar cada outra UMA vez sem
partida; depois disso, aquele par so se reavalia apos jogarem juntos.

Quem garante o "uma vez" e a chave primaria de `avaliacoes`, e nao a tela. E ha
uma segunda trava: sem policy de update, nem `upsert` sobrescreve. As duas foram
verificadas -- 409 na chave, 403 no update.

**A largura para em 768px.** Acima disso o conteudo centraliza. As telas foram
desenhadas em uma coluna; esticar num monitor de 1920 daria linha longa demais e
cartao com vao enorme. O fundo lateral exigiu trocar o tema do react-navigation
-- o cinza padrao dele vem de dentro do navegador, e nenhuma View por cima
alcanca.

**Autenticacao e do Supabase Auth, nao nossa.** O pedido original era uma tabela
`User` com `passwordHash`. Guardar senha a mao seria o ponto mais fragil do
sistema. O que importava do pedido esta mantido: identidade (`auth.users`)
separada do jogador (`public.jogadores`), e-mail nunca como chave, e o resto do
app falando so com `src/lib/auth.ts`. Acrescentar Google depois e uma funcao
nova nesse arquivo.

**O rating nao e gravado.** E sempre calculado a partir das avaliacoes, entao
mudar a formula vale na leitura seguinte, sem recalculo em massa. Os pesos
ficam no SQL -- ver a decisao acima --, entao muda-los pede uma migracao nova.

A unica excecao e `partida_jogadores.rating_no_momento`, que E uma coluna: o
rating congelado no instante do sorteio. Foi essa excecao que quase passou
despercebida na correcao de escala da 0012.

**A escala do voto e 1 a 5; a do rating exibido e 0 a 10.** O documento original
misturava as duas. O voto casa com as estrelas da interface; o rating tem casa
decimal porque precisa ordenar jogadores proximos.

**Resistencia a voto injusto e media bayesiana**, nao mediana nem media aparada.
`(C*prior + soma) / (C + n)`: com poucos votos o valor fica perto do meio da
escala, e vai soltando conforme a amostra cresce. E simples de explicar, de
testar e de trocar depois -- que era o pedido do documento.

**A web roda como SPA.** `web.output: "single"`. O app e todo atras de login,
entao pre-render nao entrega nada, e o cliente do Supabase precisa de `window`
para inicializar.

**Sem script de lint.** O `expo lint` do template nao tem eslint como
dependencia: rodar grava as deps no `package.json` sem tocar no lockfile, e
`npm ci` passa a falhar. Se adotarmos eslint, sera com lockfile no commit.

**O agregado nao devolve contagem de avaliadores.** Fecha o item que estava em
aberto desde a etapa 04. Hoje `ratings_dos_jogadores()` devolve a coluna
`avaliadores`, e a lista mostra "7 avaliadores" embaixo do rating. Esse e o
ataque mais barato contra o voto privado: quem anota o par (contagem, rating)
antes e depois de uma partida resolve por subtracao o voto exato que entrou no
meio. Com amostra pequena a conta fecha de primeira, e nao exige acesso ao
banco -- basta olhar a tela duas vezes.

O que basta no lugar ja existe: o booleano `confiavel`. Ele responde a unica
pergunta que a interface faz -- mostrar o numero ou mostrar um traco -- e nao
carrega informacao de voto nenhum. Abaixo do piso a funcao continua devolvendo
o prior puro, e nao a media parcial: valor fixo nao vaza nada e ainda serve ao
sorteio.

O custo e uma migracao para tirar a coluna do retorno, o tipo em
`src/lib/ratings.ts`, e as linhas de `(abas)/index.tsx` que exibem a contagem.
Some da tela um numero que era informativo; e o preco de a nota continuar
privada.

**O sorteio continua rodando no navegador.** Fecha o item que estava em aberto
desde a etapa 06 -- a decisao ja tinha sido tomada de fato, e nunca registrada.

Sim, da para forjar times mexendo no cliente: `sortearTimes` roda no aparelho e
ninguem confere a divisao depois. O que isso rende a quem fizer e escolher a
propria escalacao numa pelada, o que ja se consegue conversando. O que
realmente importa proteger -- o rating -- e calculado no banco, e
`criar_partida()` recusa escalacao invalida: menos de quatro por time, id
repetido, jogador inexistente. Mover o motor para o banco custaria perder o
teste deterministico com fonte de aleatoriedade injetavel, que e o que permite
provar que o modo rigoroso nunca sai pior que o solto.

**O placar nao se escreve pelo aplicativo.** O banco aceita, a policy existe, o
historico ja exibe -- e a tela que digitaria o numero nao vai ser feita. A
`salvarPlacar()` foi removida por isso: funcao sem chamador parece
funcionalidade pronta para quem le o modulo depois. A leitura fica, e mostra um
traco quando nao ha placar, que e a verdade.

**As telas passam a usar o design system.** Escolhida a conversao das nove
telas para os tokens de `src/design/tokens.ts`, e nao o caminho barato de
congelar os tokens e mover o teste de contraste para a paleta escura. O custo e
refazer as telas; em troca, os 42 testes de contraste passam a medir o que as
pessoas realmente veem, e o `app.json` volta a dizer a verdade sobre o tema.

**A tabela `avaliacoes` vira `avaliacoes_iniciais`.** O nome parou de descrever
a tabela quando a 0015 a transformou na avaliacao inicial. O custo e concreto e
foi aceito de olhos abertos: `ratings_dos_jogadores()` le dessa tabela, entao
renomear obriga a redefinir a funcao mais uma vez, logo depois de a 0017 ter
consolidado as cinco copias em uma. Essa e a ultima copia.

**A documentacao se separa em `/docs`.** O README passou de 500 linhas e virou
quatro documentos em um. O estado do projeto continua tendo fonte unica; o que
muda e que ela deixa de dividir arquivo com o manual de uso.

**Um projeto Supabase so.** Nao havera banco separado de desenvolvimento. E a
raiz do problema que as contas de teste criaram -- elas vivem no mesmo banco que
o app real --, e a decisao e conviver com isso: a mitigacao e a senha estar fora
do repositorio e ser trocavel por script.

**Sem backup, conscientemente.** O plano gratuito do Supabase tem retencao
curta, e nao havera rotina de backup enquanto isto for um grupo de amigos. Fica
registrado como risco aceito, e nao como esquecimento -- se o grupo passar a
depender do historico de avaliacoes, a decisao precisa ser revista.

**As regras de autorizacao vivem no banco, nao na tela.** Quem pode avaliar
quem, quando, e quem pode editar qual perfil e decidido por policies de RLS.
Interface escondida nao protege nada -- um `curl` com a chave publica bateria
na mesma parede.

**A janela de avaliacao e gravada na criacao da partida**, nao calculada na
hora, e nao depende de cron. Se esta aberta e uma comparacao entre o instante
atual e os dois marcos gravados, feita pelo servidor.


# Virar app de celular depois

O projeto é Expo, então o mesmo código que roda no navegador gera aplicativo
Android e iOS — `npm run android` e `npm run ios` já estão no `package.json`.
Não há migração a fazer no dia em que isso for desejado.

Para que continue assim, vale **uma regra**: só usar bibliotecas que existam
dentro do Expo Go. Assim que entrar um pacote com código nativo próprio, esse
caminho barato acaba: passa a ser necessário um *development build*, e o iOS
exige o Apple Developer Program (US$ 99/ano).

## Em aberto

- **Grupos.** Hoje a lista de jogadores e global: todo mundo que se cadastra ve
  todo mundo. Serve para um grupo unico. Se o app passar a atender varios
  grupos, `jogadores` precisara de um vinculo e a RLS muda junto.

  Um desenho ja fechado em outro projeto, caso sirva de ponto de partida:
  codigo de convite de 6 caracteres num alfabeto sem I, L, O, 0 e 1 -- o codigo
  e ditado em quadra e digitado no celular do outro, entao o que se confunde a
  olho sai do alfabeto, e o campo filtra por esse mesmo alfabeto para o erro
  aparecer na hora de digitar e nao depois de uma ida ao servidor; entrada e
  saida por funcao `security definer`, e nao escrita direta na tabela de
  vinculo, para a recusa poder reclamar em vez de casar com zero linhas; e o
  pertencimento checado por funcao, pela armadilha da recursao acima. Sem
  policy de INSERT na tabela de vinculo, so se entra pelo codigo.
