# Operação

Como configurar, rodar, publicar e povoar o banco. Para o que o projeto É, ver
o [README](../README.md); para por que cada coisa é como é, as
[decisões](decisoes.md).

# Configuração

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

5. **Depois de criar sua conta pelo app**, promova-a a administradora, se
   quiser: abra `supabase/manual/promover-admin.sql`, troque o e-mail na linha
   marcada e rode no SQL Editor.

   Esse passo é manual e fica fora das migrações de propósito. Quem é o
   administrador é **dado**, não esquema: varia de instalação para instalação, e
   não há caminho pela API para alguém se promover — o `grant` de `jogadores` é
   por coluna, e `admin` fica de fora dele.

# Dados de demonstração

Para encher o banco com jogadores fictícios durante o desenvolvimento:

```bash
python scripts/gerar-avatares.py
python scripts/semear.py
```

Todos ficam sob o domínio `@volei4x4-teste.com`, para nunca serem confundidos
com pessoas reais. Os avatares são gerados — círculo colorido com iniciais —, e
não fotos de gente de verdade.

**Antes de rodar, defina `VOLEI_SENHA_DE_TESTE`** no `.env.local` (ou no
ambiente). É a senha das contas fictícias, e os scripts param sem ela.

Ela já esteve escrita dentro de `scripts/semear.py`, e isso era um problema
real: o repositório é público, as contas de demonstração vivem no **mesmo**
projeto Supabase que atende produção, e o app está no ar sem barreira. Com o
domínio previsível e a senha em texto puro, qualquer pessoa entrava como um dos
jogadores fictícios e podia fazer a avaliação inicial de todo mundo — treze
contas passam do piso de cinco avaliadores e movem o rating de qualquer jogador
real.

Repare que o nome **não** começa com `EXPO_PUBLIC_`: esse prefixo faz o Expo
embutir o valor no bundle da web, o que republicaria a senha por outra porta.

# Antes de commitar

```bash
npx tsc --noEmit
npm run teste
```

**O `tsc` precisa que o servidor tenha rodado pelo menos uma vez.** Os tipos
gerados — `expo-env.d.ts` e `.expo/types/` — nascem do `npx expo start` e estão
no `.gitignore`. Em árvore recém-clonada, antes disso, o `tsc` acusa rota
inexistente. O mesmo vale ao criar uma rota nova: reinicie o servidor.

# Publicar

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

O deploy está completo: as variáveis de ambiente existem no painel e a
Deployment Protection está desligada — conferido com requisição direta, que
volta 200 sem passar por autenticação da Vercel. O que resta é o A-01 do
[Estado atual](#estado-atual): a chave anon está gravada quebrada em linhas, e
só funciona porque `src/lib/supabase.ts` limpa espaço em branco.
