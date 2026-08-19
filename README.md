# Vôlei 4x4

App para grupos que jogam vôlei de areia e perdem tempo montando time. O grupo
avalia os próprios jogadores, o app aprende o nível de cada um e sorteia dois
times de quatro que sejam de fato parelhos — com sorte suficiente para os times
não serem sempre os mesmos.

Roda no navegador, em qualquer celular ou computador. É feito para ser usado em
pé, na beira da quadra, com o celular na mão.

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

- O número grande é o **rating**, de 0 a 10.
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

## Estado atual

Etapas 01 a 07 concluídas, mais o módulo de avaliação pós-partida e o papel de
administrador. O detalhe de cada uma está em [docs/plano.md](docs/plano.md).

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
