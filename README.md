# Vôlei 4x4

App para grupos que jogam vôlei de areia e perdem tempo montando time. O grupo
avalia os próprios jogadores, o app aprende o nível de cada um e sorteia dois
times de quatro que sejam de fato parelhos — com sorte suficiente para os times
não serem sempre os mesmos.

Funciona no navegador, no Android e no iOS, com o mesmo código.

## O que o app faz

**Conta e perfil.** Você cria conta com e-mail e senha, informa nome, apelido e
cidade, e faz uma autoavaliação inicial nas oito características de jogo.

**Características de jogo.** Ataque, defesa, passe, saque, bloqueio, agilidade,
leitura de jogo e trabalho em equipe — cada uma de 1 a 5 estrelas. Não existe
posição: em 4x4 de areia todo mundo faz tudo, então o equilíbrio olha para as
características gerais, não para levantador ou líbero.

**Avaliação entre jogadores.** Cada pessoa avalia as outras nas mesmas oito
características. Ninguém avalia a si mesmo, e dá para voltar e corrigir a sua
avaliação quando quiser — a nota é uma opinião que amadurece, não um voto único.

**Rating.** A partir das avaliações recebidas, o app calcula um rating interno
por jogador. Quanto mais o grupo joga e avalia, melhor o sistema conhece o nível
de cada um.

**Sorteio inteligente.** Você marca exatamente 8 presentes e o app monta Time A
e Time B. Ele não sorteia no acaso: avalia todas as divisões possíveis, separa
as mais equilibradas e sorteia entre elas. Equilíbrio e variedade ao mesmo
tempo.

**Histórico.** Placar, vencedor e quem jogou em cada time ficam registrados,
para o sistema melhorar com o tempo.

## Como a autoavaliação entra na conta

A nota que você dá a si mesmo **não** vale o mesmo que a que os outros te dão.
Ela serve de ponto de partida enquanto você ainda tem poucas avaliações
recebidas, e vai perdendo influência conforme o grupo te avalia.

## O rating não é uma sentença

O objetivo não é decidir quem é o melhor jogador — é montar partidas
equilibradas e divertidas. Por isso o app mostra médias e não expõe quem deu
qual nota, e um voto isolado muito fora da curva não derruba nem infla o rating
de ninguém: a média é puxada para o meio da escala enquanto a amostra é pequena.

## O fluxo

```text
CRIAR CONTA → PERFIL → AVALIAR O GRUPO → RATING
                                            ↓
                              SELECIONAR 8 PRESENTES
                                            ↓
                                   TIME A  ×  TIME B
                                            ↓
                                    RESULTADO
                                            ↓
                                 NOVAS AVALIAÇÕES
```

---

# Parte técnica

**Expo + React Native + Expo Router**, um código só para web, Android e iOS.
**Supabase** (Postgres) para banco e autenticação, no plano gratuito.

## Estado atual

Etapa 01 concluída: estrutura, banco e autenticação por e-mail e senha. As
demais etapas estão em [docs/plano.md](docs/plano.md).

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
   npm run web      # navegador
   npm run android  # Android
   npm run ios      # iOS (precisa de macOS)
   ```

## Autenticação, e por que não é uma tabela de senhas

O documento do projeto pedia uma tabela `User` com `passwordHash` próprio. Aqui
quem guarda credencial é o Supabase Auth, e a razão é direta: escrever hash de
senha à mão seria o ponto mais frágil do sistema, e não há nada a ganhar com
isso.

O que importava no pedido está mantido:

- **identidade e jogador são coisas separadas** — `auth.users` é a identidade,
  `public.jogadores` é a pessoa dentro do jogo;
- **o e-mail não é chave de nada**; a chave é um uuid interno que sobrevive a
  troca de e-mail e a troca de provedor;
- **nada do aplicativo sabe como a pessoa entrou.** Telas, avaliações, rating e
  sorteio falam com `src/lib/auth.ts` e nunca com o Supabase Auth direto.

Acrescentar "Entrar com Google" depois é escrever uma função em
`src/lib/auth.ts` e um botão no login. Jogadores, avaliações, rating, partidas e
sorteio não mudam.

## Onde fica cada coisa

| Caminho | O que tem |
|---|---|
| `src/app/` | Rotas, e só rotas — telas e layout do expo-router |
| `src/nucleo/` | Regra pura e testável: atributos, pesos, rating, sorteio |
| `src/lib/` | Conversa com o Supabase: auth, jogadores, avaliações |
| `src/components/` | Componentes de interface reaproveitados |
| `src/contexts/` | Sessão de autenticação |
| `src/constants/` | Paleta e espaçamentos |
| `supabase/migrations/` | Esquema, RLS e funções — aplicadas à mão |

`src/nucleo/` é a parte que não depende de React nem de rede. O motor de
balanceamento vive lá justamente para poder ser testado sozinho, sem subir o
app.

## Decisões que valem saber

**Os pesos das características ficam em um lugar só**, em
`src/nucleo/atributos.ts`. O rating nunca é gravado no banco — é sempre
calculado —, então mudar um peso muda o rating de todo mundo na leitura
seguinte, sem migração.

**A web roda como SPA** (`web.output: "single"`), e não com pré-render. O app
inteiro fica atrás de login: não há o que um render de servidor entregar, e o
pré-render ainda quebraria no cliente do Supabase, que precisa de `window`.

**Não existe script de lint.** O `expo lint` que vem no template não tem eslint
declarado como dependência: ao rodar, ele grava as dependências no
`package.json` sem tocar no lockfile, e isso quebra o `npm ci`. Se um dia o
projeto adotar eslint, será com as dependências e o lockfile no commit.

## Antes de commitar

```bash
npx tsc --noEmit
npm run teste
```

## Convenções

Código e comentários em português, sem acento em identificador. Comentário
explica **por que**, não o que o código já diz. Rotas em `src/app`, resto em
`src/`.
