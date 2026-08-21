# Como se desenvolve neste projeto

Para humano ou agente. Se você vai mexer no código, leia isto inteiro primeiro
-- são cinco minutos, e quase tudo aqui já custou caro uma vez.

## O que é

Um app para um grupo de vôlei de areia 4x4 montar times parelhos. O grupo
avalia os próprios jogadores, o banco converte isso num rating de 0 a 10, e o
motor sorteia dois times equilibrados entre as 35 divisões possíveis.

O eixo do produto **não é o sorteio -- é a privacidade do voto.** Ninguém
descobre quem deu qual nota, e é isso que todo o desenho do banco sustenta.

## Arquitetura, em cinco linhas

- **Expo + expo-router**, um código só; o alvo hoje é a web.
- **Supabase** (Postgres + Auth + Storage). **Não há servidor próprio.**
- **A autorização vive em policies de RLS**, não na tela.
- `src/nucleo/` é regra pura: não conhece React nem rede, e por isso é testável.
- `src/lib/` conversa com o Supabase; `src/app/` são rotas, e só rotas.

## Antes de alterar

1. Ler [docs/estado.md](docs/estado.md) -- o que já está quebrado e o que já foi decidido não mexer.
2. Ler [docs/decisoes.md](docs/decisoes.md). Se a mudança contraria uma decisão, **registre a reversão com o motivo** em vez de contrariá-la em silêncio.
3. **Se for mexer em SQL, ler [docs/armadilhas.md](docs/armadilhas.md) antes.** Não depois.
4. Ler os arquivos relacionados antes de editar qualquer um.
5. Não alterar nada fora do escopo pedido.
6. Preferir mudanças pequenas e incrementais.
7. Ao terminar: `npx tsc --noEmit` e `npm run teste`. Mexeu em SQL? Rodar também `supabase/testes/conferir-o-alcance.sql`.
8. Atualizar `docs/estado.md` quando o estado mudar.
9. Registrar decisão relevante em `docs/decisoes.md`.
10. Dizer exatamente quais arquivos foram modificados.

## Regras que não se quebram sem conversa

- **Autorização vive em policy, nunca só na tela.** Interface escondida não
  protege nada: um `curl` com a chave pública bate na mesma parede.
- **Só bibliotecas que existam dentro do Expo Go.** O primeiro pacote com código
  nativo próprio acaba com o caminho barato de virar aplicativo -- passa a exigir
  development build, e o iOS passa a exigir US$ 99/ano.
- **Os pesos e a fórmula do rating vivem no SQL**, nunca no TypeScript. Peso no
  cliente é peso forjável. Hoje ficam em `rating_parametros()`, na `0017`.
- **`security definer` sempre com `set search_path = ''`.** Sem isso é buraco de
  segurança: a função roda como dona do banco.
- **Tabela nova precisa de `grant` E de RLS.** São travas diferentes: `grant`
  decide SE a tabela é alcançável, RLS decide QUAIS LINHAS. Sem o `grant` a
  tabela some da API com um erro que parece "tabela inexistente".
- **Nunca commitar `.env.local`, `service_role`, ou senha em código.**

## Como rodar e conferir

```bash
npm run web            # servidor de desenvolvimento, em localhost:8081
npm run teste          # 61 testes
npx tsc --noEmit       # precisa que o servidor tenha rodado ao menos uma vez
npm run build          # gera dist/, e confere o que gerou
```

O `tsc` depende de tipos gerados pelo `expo start` (`expo-env.d.ts` e
`.expo/types/`), que estão no `.gitignore`. Em árvore recém-clonada, antes de
subir o servidor, ele acusa rota inexistente. O mesmo vale ao criar rota nova:
reinicie o servidor.

**As migrações são aplicadas à mão**, em ordem, pelo SQL Editor do painel do
Supabase. Não há CLI configurada.

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

## Convenções

Código e comentários em português, sem acento em identificador. Comentário
explica **por que**, não o que o código já diz. Rotas em `src/app`, resto em
`src/`.