## Passo 3: Testando mudanças com integração contínua

> ⏱ **Tempo estimado:** cerca de 12 minutos.

**Antes de continuar:** o PR de boas-vindas deve estar **Merged**, e a Mona deve ter publicado este passo.

Agora a equipe quer descobrir defeitos antes de integrar mudanças. O projeto inicial contém um **bug**, um erro pequeno colocado de propósito: vamos encontrá-lo pelos logs. Você não precisa saber programar para acompanhar a correção.

### 📖 Conceito: CI, actions prontas e matriz

Integração contínua, ou **CI**, executa verificações automaticamente a cada alteração. Um **teste automatizado** compara o resultado do código com o resultado esperado; se forem diferentes, avisa que há um problema.

O projeto usa **JavaScript**. O **Node.js** é o programa que executa esse código. Uma **action** é uma tarefa pronta que podemos reutilizar; `checkout` copia o repositório para o runner e `setup-node` prepara o Node.js. Não é necessário instalar as duas versões do Node no Codespaces: os testes deste passo rodarão nas máquinas do Actions.

Uma [matriz](https://docs.github.com/pt/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations) repete o job com valores diferentes. Aqui usaremos Node 24 e 26. `fail-fast: false` permite observar o resultado das duas versões, mesmo se uma falhar.

Os [eventos](https://docs.github.com/pt/actions/reference/workflows-and-actions/events-that-trigger-workflows) terão papéis diferentes:

- `push`: verificar um commit enviado às branches do exercício.
- `pull_request`: mostrar checks na revisão.
- `workflow_dispatch`: permitir execução manual **depois que o arquivo estiver na branch padrão**.

### ⌨️ Atividade: Adicionar o CI

**Onde:** no terminal e no editor do mesmo Codespaces.

1. No terminal, execute `git status`. Se houver arquivos alterados que você não reconhece, pare e peça ajuda. Com as alterações do Passo 1 já enviadas, o esperado é **working tree clean**.
1. Atualize a versão principal, que recebeu o merge no GitHub, e crie a nova branch:

   ```bash
   git switch main
   git pull --ff-only
   git switch -c ci-pipeline
   git branch --show-current
   ```

   O último comando deve mostrar **ci-pipeline**. Os Passos **3, 4 e 5** usarão essa mesma branch e o mesmo PR. `git pull` traz alterações; `git push` envia alterações.

1. Abra o novo arquivo no editor:

   ```bash
   code .github/workflows/ci.yml
   ```

1. Clique na aba **ci.yml**, cole todo o YAML abaixo e use **File → Save**. Cole o YAML no arquivo, não no terminal.

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
   ```
   {% endraw %}

1. No terminal, registre e envie o arquivo:

   ```bash
   git add .github/workflows/ci.yml
   git commit -m "Adicionar testes automaticos"
   git push -u origin ci-pipeline
   ```

1. Na página do repositório no GitHub, abra **Pull requests → New pull request**. Selecione **base: main** e **compare: ci-pipeline**, e clique em **Create pull request**.
1. Use o título `Automatizar testes e publicação` e a descrição `Adiciona testes e prepara a publicação do portal.`. Confirme em **Create pull request**.
1. **Deixe esse PR aberto até o Passo 5.** Teremos mais alterações para enviar à mesma proposta.

No YAML, `run` indica um comando que o **runner** vai executar. O **npm** acompanha o Node.js: `npm ci` prepara o projeto conforme as versões registradas no arquivo `package-lock.json`, e `npm test` executa os testes. Você só precisa enviar o workflow; não digite esses comandos no terminal para substituir a execução do Actions.

> 🔐 **Segurança:** `persist-credentials: false` impede que o checkout deixe o token salvo na configuração do Git do runner. Nenhum step deste CI precisa dele, então não há motivo para mantê-lo disponível. As `permissions` do workflow já limitam o token a leitura (`contents: read`); você verá as referências `@v7` das actions na revisão final.

### ⌨️ Atividade: Ler a falha e corrigir o código

**Onde:** primeiro no GitHub, depois no Codespaces para corrigir o arquivo.

1. Na aba do repositório, clique em **Actions** e em **CI**, no menu esquerdo. Abra a execução mais recente da branch **ci-pipeline** identificada como **push**. O título da lista costuma ser a mensagem do commit.

   > ⏳ **Aguarde:** o CI leva cerca de 1 minuto para terminar. Se a lista ainda estiver vazia, atualize a página.
1. Clique no job **Testes (Node 24)** e expanda **Executar testes**. **A primeira falha, em vermelho, é esperada.** Também haverá um job **Testes (Node 26)**.
1. No log, procure o teste **converte o nome de uma seção em uma âncora com hífen**. O resultado produzido (**actual**) é `meu_site`, mas o esperado (**expected**) é `meu-site`. Uma **âncora** identifica uma seção da página para que um link leve a ela.
1. Volte ao terminal do Codespaces e abra os arquivos:

   ```bash
   git branch --show-current
   code src/slugify.js test/slugify.test.js
   ```

   A branch deve continuar **ci-pipeline**. `src/slugify.js` tem a função que transforma o texto; `test/slugify.test.js` descreve o resultado que ela deveria produzir.

1. No editor, selecione **slugify.js**. No final da linha com `replace`, troque **somente** o separador `'_'` por `'-'`. Isso faz as palavras serem unidas por um hífen.
1. Salve com **File → Save**. **Não mude o teste** para aceitar o resultado errado e não adicione `continue-on-error` ao workflow: queremos corrigir o defeito, não esconder a falha.
1. No terminal, envie a correção:

   ```bash
   git add src/slugify.js
   git commit -m "Corrigir separador das ancoras"
   git push
   ```

1. Volte a **Actions → CI**, atualize a página e abra a **nova execução**, com a mensagem `Corrigir separador das ancoras`. A execução antiga continuará vermelha: ela registra o código antigo.
1. Aguarde **Testes (Node 24)** e **Testes (Node 26)** ficarem verdes. Volte a esta issue e aguarde o **Passo 4**. **Não faça merge ainda.**

**Resultado esperado:** dois testes de versões diferentes aprovados na nova execução, o PR `ci-pipeline → main` ainda aberto e o Passo 4 disponível.

Durante o exercício, o mesmo commit pode ter uma execução de `push` e outra de `pull_request`. O tutor avalia a execução de **push**; a de PR fornece os checks da revisão.

O **Passo 3** pode aparecer executando ao mesmo tempo que **CI**: ele espera o resultado do CI daquele commit antes de avaliar.

<details>
<summary>Precisa de ajuda?</summary>

- Se nem o CI aparece, confira `name: CI`, o nome `ci.yml`, a indentação e os eventos. Depois faça outro commit em `ci-pipeline`.
- Se a branch `ci-pipeline` já existe, use `git switch ci-pipeline`; não a recrie com outro nome.
- Se o erro é `npm ci`, confirme que o projeto foi copiado com `package.json` e `package-lock.json`; não é a falha intencional.
- Se o teste mostra `meu_site` em vez de `meu-site`, a correção está no último argumento de `replace`:

  ```javascript
  export function slugify(text) {
    return text.trim().toLowerCase().replace(/\s+/g, '-');
  }
  ```

- A mudança precisa estar em `ci-pipeline`. Use `git status` para conferir a branch e alterações pendentes. Salvar o arquivo sem `git add`, `git commit` e `git push` não corrige a execução no GitHub.
- O botão de execução manual de **CI** pode ainda não aparecer: o arquivo só está na branch do PR. Faça um novo commit para testar.
- Se o CI passou e a próxima atividade não apareceu, peça uma nova avaliação em **Actions → Passo 3 → Run workflow → main**.

</details>
