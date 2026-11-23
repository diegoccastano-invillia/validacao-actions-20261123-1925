## Passo 5: Publicando no GitHub Pages

> ⏱ **Tempo estimado:** cerca de 12 minutos. Este é o último passo do caminho principal.

**Antes de continuar:** a Mona liberou este passo, o artefato `site` foi conferido e o PR **Automatizar testes e publicação** continua aberto.

Agora o portal pode sair do pacote de arquivos e ganhar um endereço público. **Deploy** significa publicar uma versão para que as pessoas possam acessá-la.

### 📖 Conceito: publicação, environment e configuração

[GitHub Pages](https://docs.github.com/pt/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) hospeda sites estáticos, feitos de arquivos como HTML e CSS. O job de deploy baixa o site gerado no passo anterior e o empacota no formato esperado pelo Pages: **só renomear o artefato não converte seu formato**.

Um [environment](https://docs.github.com/pt/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), ou **ambiente de publicação**, registra as entregas e pode exigir aprovações. Usaremos o nome `github-pages`. Um **output** é um valor devolvido por uma etapa: `page_url` será o endereço do site, devolvido pela etapa identificada como `publicar`.

`SITE_TITLE` é uma **variável**, não um secret: o título aparecerá no site público. Secrets guardam dados confidenciais; nunca envie credenciais para um artefato ou um site.

### ⌨️ Atividade: Configurar o destino

**Onde:** na página do seu repositório no GitHub, não nas configurações do Codespaces.

1. Abra [seu repositório](https://github.com/{{ full_repo_name }}) e clique na aba **Settings** (configurações), no topo. Se a aba não aparecer, procure no menu **…**.
1. No menu esquerdo, em **Code and automation**, clique em **Pages**.
1. Em **Build and deployment**, encontre **Source** (origem) e selecione **GitHub Actions**. A escolha fica salva. Se aparecerem sugestões de geradores de workflow, não clique em **Configure**: usaremos o arquivo que já estamos construindo.
1. Ainda nas configurações, no menu esquerdo, expanda **Secrets and variables** e clique em **Actions**.
1. Na área central, clique na aba **Variables**, não em **Secrets**. Depois clique em **New repository variable**.
1. Preencha **Name** com `SITE_TITLE`, exatamente assim, em maiúsculas. Em **Value**, escreva `Portal da minha equipe` ou outro título público.
1. Clique em **Add variable**. Confira que `SITE_TITLE` aparece na lista de variáveis do repositório.

Uma **variável** é um valor com nome que a receita pode consultar. Aqui ela muda o título sem exigir uma alteração no código. Não use uma senha como valor.

### ⌨️ Atividade: Publicar o mesmo build

**Onde:** volte ao Codespaces. Continuaremos na branch **ci-pipeline**.

1. No terminal, abra o workflow:

   ```bash
   git switch ci-pipeline
   git branch --show-current
   code .github/workflows/ci.yml
   ```

   Confira que o nome exibido é **ci-pipeline**.

1. No editor, encontre o job `build:` e, dentro dele, o step **Gerar arquivos**. Substitua esse step (as linhas `- name: Gerar arquivos` e `run: npm run build`) pelo bloco abaixo, incluindo `env`. Não crie um segundo step com o mesmo nome.

   {% raw %}
   ```yaml
         - name: Gerar arquivos
           run: npm run build
           env:
             SITE_TITLE: ${{ vars.SITE_TITLE }}
   ```
   {% endraw %}

1. Vá ao fim do arquivo. Dentro de `jobs`, depois de `verify-artifact`, acrescente `deploy` com **dois espaços** antes do nome, alinhado com `test`, `build` e `verify-artifact`.

   Se preferir, use **Ficou perdido? Veja o ci.yml completo até aqui**, no final, para substituir o arquivo inteiro. Não cole o exemplo completo depois do conteúdo existente.

   {% raw %}
   ```yaml
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

1. Salve com **File → Save** e envie pelo terminal:

   ```bash
   git add .github/workflows/ci.yml
   git commit -m "Publicar portal no GitHub Pages"
   git push
   ```

### ⌨️ Atividade: Integrar e abrir o site

**Onde:** na página do repositório no GitHub.

1. Abra **Pull requests → Automatizar testes e publicação → Checks**. Aguarde os testes, **Gerar site** e **Conferir artefato** passarem na nova versão.
1. Observe **Publicar site** como **Skipped** (ignorado, em cinza). Isso é esperado: `if: github.ref == 'refs/heads/main'` permite publicar somente a `main`. Uma alteração ainda em revisão não deve substituir o site público.
1. Volte à aba **Conversation** desse PR. **Agora**, e somente agora, clique em **Merge pull request → Confirm merge**. Confira o estado **Merged**. Não use **Close pull request**.
1. Abra **Actions → CI** e localize a nova execução na branch **main**, causada pelo **push** do merge. Não use a execução antiga da branch `ci-pipeline`.
1. Aguarde **Publicar site** ficar verde. No resumo da execução, clique no endereço exibido em **github-pages** para abrir o site em outra aba. Se não encontrar o link, abra **Settings → Pages** e procure **Visit site** após a publicação.

   > ⏳ **Aguarde:** o primeiro deploy no Pages pode levar alguns minutos para responder. Se a URL ainda mostrar uma página 404 ou o título padrão, aguarde e atualize.

1. Confira o título que colocou em `SITE_TITLE`. No rodapé, **Commit** mostra o identificador da versão publicada; ele deve corresponder ao commit da execução de CI na `main`.
1. Volte à issue e aguarde a confirmação da Mona: ela vai avaliar a publicação, postar a **revisão** e concluir o exercício. O **Passo 6** aparecerá como um **desafio opcional**.

**Resultado esperado:** seu site abre com o título escolhido, o CI da `main` está verde e o README passa a mostrar **Parabéns**. A issue fica aberta para o desafio opcional, mas **você já concluiu o caminho principal**.

Se for encerrar por aqui, envie qualquer alteração pendente antes de parar o Codespaces. Em [Seus codespaces](https://github.com/codespaces), localize o ambiente do exercício e escolha **… → Stop codespace**. Isso não desliga o Pages nem impede o tutor de terminar.

`needs: verify-artifact` também espera testes e build, por dependência indireta. As permissões de publicação ficam **somente no job de deploy**. O token de identidade (`id-token`) permite ao Pages conferir a origem da publicação, sem um secret de nuvem.

`concurrency` evita publicações simultâneas. O sufixo `github.run_attempt` diferencia os pacotes do Pages quando você repete uma execução.

<details>
<summary>Precisa de ajuda?</summary>

- `github-pages` é o nome padrão do pacote de Pages, mas pode ser configurado. Aqui o upload e o deploy usam o mesmo nome com o número da tentativa.
- Se aparece “Pages não habilitado” ou erro de configuração, volte a **Settings → Pages** e escolha **GitHub Actions**. Depois use **Re-run all jobs** na execução de CI da `main` para repetir os jobs.
- Para repetir essa execução: abra **Actions → CI**, clique na execução de **push na main**, depois em **Re-run jobs → Re-run all jobs**. Não precisa criar outro PR.
- Se o título padrão continua aparecendo, confira a aba **Variables**, o nome `SITE_TITLE` e o `env` do build. Criar a variável não dispara o CI; execute-o novamente.
- Não crie `SITE_TITLE` como secret nem como variável exclusiva do environment: o build precisa lê-la antes do deploy.
- O site pode demorar a refletir a publicação. Se o CI passou e apenas a avaliação da URL falhou, aguarde e use **Actions → Passo 5 → Run workflow → main**. Isso repete a avaliação, não o deploy.
- Um CI iniciado manualmente com **Run workflow** também pode publicar a `main`, mas não avança automaticamente o tutor. Para essa atividade, use a execução de push gerada pelo merge.

</details>

<details>
<summary>Bônus opcional: Observar uma aprovação de publicação</summary>

Depois de concluir a publicação acima:

1. Abra **Settings → Environments → github-pages** e adicione um **Required reviewer** (revisor obrigatório), se a opção estiver disponível.
1. Para experimentar sozinho, selecione sua conta e não habilite **Prevent self-review**. Em uma equipe real, prefira outra pessoa como revisora.
1. Agora que `ci.yml` existe na `main`, abra **Actions → CI → Run workflow**, selecione `main` e execute.
1. Observe a pausa antes do job de deploy. Use **Review deployments** para aprovar e continuar.
1. Remova a regra ao terminar a experiência, ou lembre-se de aprovar a publicação do desafio opcional.

Esse bônus não é avaliado e não bloqueia a conclusão do exercício.

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
