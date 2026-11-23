## Passo 4: Encadeando jobs e compartilhando artefatos

> ⏱ **Tempo estimado:** cerca de 10 minutos.

**Antes de continuar:** os dois jobs de teste estão verdes, a Mona publicou este passo e o PR **Automatizar testes e publicação** continua aberto.

Vamos gerar os arquivos do portal e entregá-los a outro job. **Build** é essa preparação dos arquivos que poderão ser publicados; aqui, ela gera o HTML e o CSS do site na pasta `dist/`.

### 📖 Conceito: dependências e arquivos entre jobs

[Jobs](https://docs.github.com/pt/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs) usam ambientes independentes. Um arquivo criado em `build` **não aparece automaticamente** em outro job.

- `needs` define a ordem: um job espera seus pré-requisitos passarem.
- Um [artefato](https://docs.github.com/pt/actions/tutorials/store-and-share-data) é um pacote de arquivos guardado no GitHub por uma execução. Nosso pacote se chamará `site`.
- `upload-artifact` envia arquivos; `download-artifact` recupera o mesmo resultado em outro job.
- Artefato não é **cache**. O artefato transporta um resultado, como o site pronto. O cache reaproveita arquivos para acelerar tarefas, por exemplo evitar baixar as mesmas dependências toda vez.

O caminho será: **testes → gerar site → guardar pacote → baixar e conferir o pacote em outro job**. O comando `npm run build` já está configurado no projeto; você não precisa escrever um gerador de sites.

### ⌨️ Atividade: Gerar e recuperar o site

**Onde:** no Codespaces. Use a mesma branch e o mesmo PR do Passo 3.

1. No terminal, confira a branch e abra o arquivo:

   ```bash
   git switch ci-pipeline
   git branch --show-current
   code .github/workflows/ci.yml
   ```

   O resultado deve ser **ci-pipeline**. Não volte à `main` nem crie outra branch neste passo.

1. Na aba **ci.yml** do editor, vá ao fim do arquivo. **Dentro do bloco `jobs`**, depois do job `test`, acrescente os jobs abaixo. Não apague os testes.
1. Confira os espaços: `test:`, `build:` e `verify-artifact:` têm **dois espaços** antes do nome; suas configurações têm quatro. Não crie outro `jobs:` e não coloque `build:` dentro dos `steps` de `test`.

   Se a posição dos blocos ficar confusa, abra **Ficou perdido? Veja o ci.yml completo até aqui**, ao final desta atividade, e substitua o arquivo inteiro por aquele exemplo. As duas opções produzem o mesmo resultado; não cole as duas uma depois da outra.

   ```yaml
     build:
       name: Gerar site
       needs: test
       runs-on: ubuntu-latest
       steps:
         - name: Obter código
           uses: actions/checkout@v7
           with:
             persist-credentials: false
         - name: Preparar Node
           uses: actions/setup-node@v7
           with:
             node-version: 24
         - name: Instalar projeto
           run: npm ci
         - name: Gerar arquivos
           run: npm run build
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
   ```

1. Salve o arquivo com **File → Save**. No terminal, registre e envie:

   ```bash
   git add .github/workflows/ci.yml
   git commit -m "Gerar e compartilhar o site"
   git push
   ```

1. No GitHub, clique em **Actions → CI** e abra a execução de **push** na branch **ci-pipeline** com a mensagem `Gerar e compartilhar o site`. O PR existente recebe as alterações automaticamente; **não abra outro PR**.

   > ⏳ **Aguarde:** o pipeline completo leva cerca de 1 a 2 minutos. Enquanto ele roda, releia a lista de conceitos acima.
1. Na página da execução, observe o diagrama: os dois testes rodam ao mesmo tempo; depois vêm **Gerar site** e **Conferir artefato**. Todos devem terminar verdes.
1. Clique no job **Gerar site**, expanda **Gerar arquivos** e encontre a mensagem `Site gerado em dist/`. O build aconteceu no runner; é normal não aparecer uma pasta `dist` no Codespaces.
1. Clique no job **Conferir artefato** e expanda **Conferir arquivo recebido**. Confirme a mensagem **O index.html foi recebido em outro job.** Esse job não copiou o repositório nem gerou o site: recebeu o arquivo pelo artefato.
1. No menu esquerdo da execução, clique em **Summary** (resumo). Role até **Artifacts**. Deve existir um item **site**; se quiser inspecioná-lo, clique no nome para baixar e abra o pacote no seu computador. O download é opcional.
1. Volte à issue e aguarde o **Passo 5**. **Não clique em Merge pull request ainda.**

**Resultado esperado:** a nova execução está verde, o artefato **site** existe e o log confirma que outro job recebeu `index.html`. O PR ainda está aberto.

O artefato expira depois do período indicado em `retention-days`. `overwrite` permite substituir o mesmo nome em uma nova tentativa daquela execução.

O **Passo 4** aguarda o CI do commit que você enviou. Se a fila de runners ultrapassar o limite de espera do tutor, solicite a avaliação novamente depois que o CI terminar.

<details>
<summary>Precisa de ajuda?</summary>

- Se `build` ficou ignorado, confira os testes. O comportamento é esperado quando um pré-requisito falha.
- Se o upload não encontrou arquivos, abra **Gerar arquivos** e confira `npm run build` e o diretório `dist/`.
- Se o download falhou, os nomes precisam coincidir: `site` tanto no upload quanto no download.
- O comando `test -s` exige que o arquivo exista e não esteja vazio. Não troque por um simples `echo`.
- Se errou a indentação, `build:` e `verify-artifact:` devem ter a mesma quantidade de espaços antes deles que `test:`.
- Para enviar uma correção, salve o arquivo e repita `git add .github/workflows/ci.yml`, `git commit -m "Corrigir jobs do site"` e `git push` no terminal, nessa ordem.
- Para apenas repetir a avaliação de um CI já concluído, abra **Actions → Passo 4 → Run workflow**, mantenha **Branch: main** e confirme no botão verde **Run workflow**. Isso não cria outro build.

</details>

<details>
<summary>Ficou perdido? Veja o <code>ci.yml</code> completo até aqui</summary>

Substitua todo o conteúdo de `.github/workflows/ci.yml` (na branch `ci-pipeline`) por:

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
      - name: Preparar Node
        uses: actions/setup-node@v7
        with:
          node-version: ${{ matrix.node }}
      - name: Instalar projeto
        run: npm ci
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
      - name: Preparar Node
        uses: actions/setup-node@v7
        with:
          node-version: 24
      - name: Instalar projeto
        run: npm ci
      - name: Gerar arquivos
        run: npm run build
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
```
{% endraw %}

</details>
