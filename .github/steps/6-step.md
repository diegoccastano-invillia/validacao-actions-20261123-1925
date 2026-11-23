## Passo 6 (desafio opcional): Reutilizando e entregando a automação

> ✨ **Bônus:** você já concluiu o exercício no Passo 5. Este desafio é **opcional** e leva cerca de 12 minutos. Se o tempo da aula acabou, pode parar aqui.

**Antes de continuar:** espere a Mona confirmar a conclusão do Passo 5. Se parou o Codespaces, abra [Seus codespaces](https://github.com/codespaces) e clique no mesmo ambiente para retomá-lo.

O portal está publicado, mas os jobs de teste e build repetem a preparação do Node.js. Vamos reunir esses steps em um só arquivo e chamá-lo nos dois lugares. Isso é **reuso**: manter uma única receita em vez de corrigir duas cópias sempre que algo mudar.

### 📖 Conceito: composite action e inputs

Uma [composite action](https://docs.github.com/pt/actions/tutorials/create-actions/create-a-composite-action) é uma action composta por vários steps. Seu arquivo `action.yml` descreve entradas (`inputs`) e como executá-la (`runs`). Um **input** é um valor que quem chama a action fornece, como a versão do Node.

Aqui a entrada será a versão do Node. Os testes passam cada valor da matriz; o build usa uma versão fixa.

Uma action **local** fica no nosso repositório, não em um repositório externo. O prefixo `./` indica isso. O runner precisa ter esses arquivos: mantenha **Obter código** (`checkout`) antes de chamar a action. `shell: bash` informa qual interpretador executará os comandos `run` dentro da composite.

### ⌨️ Atividade: Extrair a preparação do Node

**Onde:** no terminal e no editor do Codespaces.

1. Execute `git status`. O esperado é **working tree clean**. Se houver mudanças pendentes, não troque de branch sem entender quais são.
1. Traga o resultado do merge do Passo 5 e a atualização do README feita pela Mona. Depois crie a branch do desafio:

   ```bash
   git switch main
   git pull --ff-only
   git switch -c composite-action
   git branch --show-current
   ```

   O nome exibido deve ser **composite-action**. Não use `ci-pipeline`: este desafio terá um novo PR.

1. Crie a pasta da action e abra o arquivo:

   ```bash
   mkdir -p .github/actions/preparar-node
   code .github/actions/preparar-node/action.yml
   ```

   `mkdir -p` cria as pastas necessárias, sem erro se já existirem. Não confunda `.github/actions` (nossas actions locais) com `.github/workflows` (as receitas que o GitHub dispara).

1. Cole o conteúdo abaixo na aba **action.yml**, no editor, e salve com **File → Save**:

   {% raw %}
   ```yaml
   name: Preparar Node
   description: Configura a versão do Node e instala o projeto pelo lockfile.

   inputs:
     node-version:
       description: Versão do Node usada pelo job
       required: true

   runs:
     using: composite
     steps:
       - name: Preparar versão do Node
         uses: actions/setup-node@v7
         with:
           node-version: ${{ inputs.node-version }}
       - name: Instalar projeto
         shell: bash
         run: npm ci
   ```
   {% endraw %}

1. Ainda no terminal, abra o workflow que chamará a nova action:

   ```bash
   code .github/workflows/ci.yml
   ```

1. Dentro do job `test`, encontre os steps **Preparar Node** e **Instalar projeto**. Remova esses dois steps inteiros, incluindo `uses`, `with`, `node-version` e `run` pertencentes a eles, e coloque no lugar o bloco abaixo. Não remova **Obter código** nem **Executar testes**.

   {% raw %}
   ```yaml
         - name: Preparar projeto
           uses: ./.github/actions/preparar-node
           with:
             node-version: ${{ matrix.node }}
   ```
   {% endraw %}

1. Dentro do job `build`, substitua somente **Preparar Node** e **Instalar projeto** pelo bloco abaixo. Aqui usamos Node `24`, sem matriz.

   ```yaml
         - name: Preparar projeto
           uses: ./.github/actions/preparar-node
           with:
             node-version: 24
   ```

1. Confira a ordem em `test`: **Obter código → Preparar projeto → Executar testes**. Em `build`: **Obter código → Preparar projeto → Gerar arquivos → Guardar site**. Preserve `SITE_TITLE`, os artefatos e o deploy.
1. Se tiver dúvida na substituição, use o `ci.yml` completo ao final deste passo. Ele não substitui o `action.yml`: **os dois arquivos são necessários**.
1. Salve `ci.yml` e registre os dois arquivos juntos:

   ```bash
   git add .github/actions/preparar-node/action.yml .github/workflows/ci.yml
   git commit -m "Reutilizar preparacao do Node"
   git push -u origin composite-action
   ```

### ⌨️ Atividade: Verificar que a entrega continua funcionando

**Onde:** na página do repositório no GitHub.

1. Abra **Pull requests → New pull request**. Escolha **base: main** e **compare: composite-action**.
1. Confira os dois arquivos na comparação. Clique em **Create pull request**, use o título `Reutilizar preparação do Node`, escreva `Centraliza os steps de preparação em uma action local.` na descrição e confirme em **Create pull request**.
1. Abra **Checks** e aguarde as duas versões dos testes, **Gerar site** e **Conferir artefato** passarem. **Publicar site** fica como **Skipped** no PR, como no Passo 5.

   > ⏳ **Aguarde:** o CI do PR leva cerca de 1 a 2 minutos; o do merge na `main` inclui o deploy e pode levar um pouco mais.

1. Volte a **Conversation**, clique em **Merge pull request → Confirm merge** e confira **Merged**.
1. Em **Actions → CI**, abra a nova execução de **push na main** e aguarde o deploy. Se experimentou o bônus de aprovação do Passo 5, clique em **Review deployments**, marque **github-pages** e confirme em **Approve and deploy**.
1. Abra o endereço do site no resumo da execução ou em **Settings → Pages → Visit site**. O título permanece; o commit do rodapé deve corresponder à nova publicação.
1. Volte a esta issue e aguarde: a Mona confirmará o desafio, atualizará o README e encerrará a issue.

**Resultado esperado:** o CI e a publicação continuam funcionando, agora usando a composite action. A issue aparece como **Closed** e o README confirma o desafio. Ao encerrar, pare o ambiente em [Seus codespaces](https://github.com/codespaces), em **… → Stop codespace**.

<details>
<summary>Precisa de ajuda?</summary>

- Se aparece que `action.yml` não foi encontrado, confira o caminho `.github/actions/preparar-node/action.yml` e o checkout antes da action local.
- Se `composite-action` já existe, use `git switch composite-action` e retome de onde parou. Para enviar uma correção, salve os arquivos, repita o `git add` dos dois caminhos, use `git commit -m "Corrigir action local"` e depois `git push`. O PR aberto é atualizado sem precisar criar outro.
- Se o erro pede `shell`, adicione `shell: bash` ao step `run: npm ci` da composite action.
- Em `test`, o input usa `matrix.node`. Em `build`, use `24`; esse job não tem matriz.
- Não remova `npm test` nem `npm run build`: somente a preparação foi extraída.
- O tutor precisa da refatoração **mergeada e publicada**. Um CI verde apenas em `composite-action` ainda não encerra o desafio.
- Se a publicação final passou e a confirmação não apareceu, use **Actions → Passo 6 → Run workflow → main**.

</details>

<details>
<summary>Ficou perdido? Veja o <code>ci.yml</code> completo ao final do desafio</summary>

Na branch `composite-action`, o `.github/workflows/ci.yml` completo fica assim:

{% raw %}
```yaml
name: CI

on:
  push:
    branches: [main, ci-pipeline, composite-action]
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  test:
    name: Testes (Node ${{ matrix.node }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: [24, 26]
    steps:
      - name: Obter código
        uses: actions/checkout@v7
        with:
          persist-credentials: false
      - name: Preparar projeto
        uses: ./.github/actions/preparar-node
        with:
          node-version: ${{ matrix.node }}
      - name: Executar testes
        run: npm test

  build:
    name: Gerar site
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Obter código
        uses: actions/checkout@v7
        with:
          persist-credentials: false
      - name: Preparar projeto
        uses: ./.github/actions/preparar-node
        with:
          node-version: 24
      - name: Gerar arquivos
        run: npm run build
        env:
          SITE_TITLE: ${{ vars.SITE_TITLE }}
      - name: Guardar site
        uses: actions/upload-artifact@v7
        with:
          name: site
          path: dist/
          if-no-files-found: error
          overwrite: true
          retention-days: 1

  verify-artifact:
    name: Conferir artefato
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Baixar site
        uses: actions/download-artifact@v8
        with:
          name: site
          path: site
      - name: Conferir arquivo recebido
        run: |
          test -s site/index.html
          echo "O index.html foi recebido em outro job."

  deploy:
    name: Publicar site
    needs: verify-artifact
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    concurrency:
      group: github-pages
      cancel-in-progress: false
    environment:
      name: github-pages
      url: ${{ steps.publicar.outputs.page_url }}
    steps:
      - name: Baixar site
        uses: actions/download-artifact@v8
        with:
          name: site
          path: site
      - name: Preparar pacote do Pages
        uses: actions/upload-pages-artifact@v5
        with:
          path: site
          name: github-pages-${{ github.run_attempt }}
      - name: Publicar
        id: publicar
        uses: actions/deploy-pages@v5
        with:
          artifact_name: github-pages-${{ github.run_attempt }}
```
{% endraw %}

</details>
