## Passo 1: Criando seu primeiro workflow

> ⏱ **Tempo estimado:** cerca de 10 minutos, com o Codespaces pronto. Na primeira vez, reserve também tempo para criar o ambiente e conhecer a tela.

A equipe quer enviar uma mensagem de boas-vindas a quem propõe uma alteração no projeto. Vamos preparar essa automação. **Neste passo, ainda não abriremos a proposta de alteração.**

<img width="160" alt="Octocat investigando uma atividade" src="../images/inspectocat.png" />

### 📖 Antes de começar: os nomes que vamos usar

| Nome | Significado neste exercício |
| --- | --- |
| Repositório | Os arquivos do projeto e o histórico das alterações. Você já criou sua cópia no GitHub. |
| Git | A ferramenta que registra versões dos arquivos. Vamos usá-la com comandos. |
| Branch | Uma linha de trabalho separada. Vamos experimentar nela sem alterar diretamente a versão principal, chamada `main`. |
| Commit | Um registro das alterações, acompanhado de uma mensagem que explica o que mudou. |
| Push | O envio dos commits do Codespaces para o repositório no GitHub. |
| Pull request (PR) | Uma proposta para juntar as mudanças de uma branch à outra. Faremos isso no Passo 2. |

### ⌨️ Atividade: Abrir o Codespaces

**Onde:** nesta issue. O botão abaixo abre o Codespaces para **sua cópia do exercício**, `{{ full_repo_name }}`.

1. Clique com o botão direito no botão abaixo e escolha **Abrir link em nova aba**, para manter esta issue aberta.

   [![Abrir no GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/{{ full_repo_name }}?quickstart=1)

1. Na página aberta, mantenha a configuração padrão e clique em **Create codespace**. Se aparecer **Resume this codespace**, clique nele para retomar seu ambiente existente em vez de criar outro. Se já criou um ambiente e ele não aparecer, procure-o em [Seus codespaces](https://github.com/codespaces).

   > **Antes de criar:** confira a conta responsável pelo uso. O Codespaces consome uma cota de processamento e armazenamento; veja [consumo e cobrança](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces). Se aparecer um bloqueio de cota ou uma cobrança que você não esperava, pare e peça ajuda.

1. Aguarde carregar o **VS Code no navegador**. Essa tela é o editor: à esquerda ficam os arquivos; no centro, o arquivo aberto; embaixo, o terminal. A preparação pode levar alguns minutos.
1. Se o terminal não estiver visível, no menu do editor abra **Terminal → New Terminal**. Em telas pequenas, o menu pode estar dentro do botão **☰** no canto superior esquerdo.

O **terminal** é a área onde você digita comandos. Clique nela, cole **uma linha por vez** e pressione **Enter**. Espere o comando terminar antes de ir para a próxima linha. Não cole as cercas de código (as linhas com três crases).

**Use o terminal do Codespaces durante todo o exercício.** Ele já tem o repositório copiado e o Git preparado; não execute `git init` nem `git clone`. O Codespaces não é o runner do Actions: é seu ambiente de edição. Os runners executarão as automações separadamente.

### ⌨️ Atividade: Criar a branch de trabalho

**Onde:** no terminal do Codespaces.

1. Confira onde você está e se há alterações:

   ```bash
   pwd
   git status
   ```

   `pwd` mostra a pasta atual: deve ser `/workspaces/` seguido do nome do seu repositório. `git status` deve informar **On branch main** e **nothing to commit, working tree clean**: estamos na `main` e não há alterações pendentes.

1. Atualize a `main` do Codespaces com o que está no GitHub e crie a branch:

   ```bash
   git switch main
   git pull --ff-only
   git switch -c welcome-workflow
   git branch --show-current
   ```

   - `git switch main`: escolhe a versão principal.
   - `git pull --ff-only`: traz as atualizações do GitHub, inclusive as do tutor, sem criar uma integração inesperada.
   - `git switch -c welcome-workflow`: cria (`-c`) e seleciona a branch **welcome-workflow**. Use o nome exatamente assim, sem espaços.
   - `git branch --show-current`: deve mostrar **welcome-workflow**.

**Se um comando falhar, não continue para o próximo.** Consulte a ajuda ao final. Não use `--force` nem apague arquivos para tentar resolver.

### 📖 Conceito: workflow, evento, job e step

Um [workflow](https://docs.github.com/pt/actions/get-started/understand-github-actions) é uma receita de automação. Ela fica em um arquivo **YAML**, formato de texto em que os espaços no início das linhas indicam quais configurações estão dentro de outras. O GitHub procura essas receitas na pasta `.github/workflows`.

| Elemento | O que faz aqui |
| --- | --- |
| `on` | Escolhe o **evento**, o acontecimento que inicia a receita: aqui, abrir ou reabrir um PR. |
| `jobs` | Define os **jobs**, grupos de tarefas. Aqui teremos um: publicar o comentário. |
| `runs-on` | Escolhe o **runner**, a máquina temporária que o GitHub usa para executar o job. |
| `steps` | Lista as etapas executadas em ordem dentro de um job. |
| `permissions` | Limita as operações que a automação pode realizar no repositório. |

O [`GITHUB_TOKEN`](https://docs.github.com/pt/actions/tutorials/authenticate-with-github_token) é uma credencial temporária criada pelo GitHub para a execução. Você **não precisa criar nem copiar um token pessoal**. Para comentar no PR, este workflow recebe apenas `pull-requests: write`.

### ⌨️ Atividade: Criar o arquivo da automação

**Onde:** no Codespaces.

1. No terminal, abra um novo arquivo no editor:

   ```bash
   code .github/workflows/welcome.yml
   ```

   `code` abre o arquivo no VS Code. O caminho significa: pasta `.github`, subpasta `workflows`, arquivo `welcome.yml`. Essas pastas já existem na cópia do exercício.

1. Clique na aba **welcome.yml** que abriu no centro da tela. Cole **todo** o YAML abaixo **no arquivo, não no terminal**. Preserve os espaços; não inclua as linhas com três crases.

   {% raw %}
   ```yaml
   name: Boas-vindas

   on:
     pull_request:
       types: [opened, reopened]

   permissions:
     pull-requests: write

   jobs:
     welcome:
       name: Comentar no pull request
       runs-on: ubuntu-latest
       steps:
         - name: Publicar boas-vindas
           env:
             GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
             PR_URL: ${{ github.event.pull_request.html_url }}
           run: |
             gh pr comment "$PR_URL" --body '<!-- boas-vindas-actions -->
             Boas-vindas! Este comentário foi publicado pelo GitHub Actions.'
   ```
   {% endraw %}

1. No menu do editor, clique em **File → Save** (Arquivo → Salvar). O ponto de alteração na aba deve desaparecer.
1. Volte ao terminal. Confira, registre e envie o arquivo, executando uma linha de cada vez:

   ```bash
   git status
   git add .github/workflows/welcome.yml
   git commit -m "Criar workflow de boas-vindas"
   git push -u origin welcome-workflow
   ```

   - `git status`: deve continuar mostrando **welcome-workflow** e listar o novo arquivo em **Untracked files** (ainda não registrado).
   - `git add`: seleciona esse arquivo para o próximo commit.
   - `git commit -m`: registra a mudança; o texto entre aspas é a mensagem.
   - `git push`: envia o commit. `origin` é o nome do endereço do seu repositório no GitHub. `-u` associa a branch local à remota; nos próximos envios dessa branch bastará `git push`.

1. Abra [seu repositório](https://github.com/{{ full_repo_name }}) em outra aba. Clique em **Code**, abra o seletor de branches e escolha **welcome-workflow**. Abra `.github` → `workflows` → `welcome.yml` e confirme que seu arquivo chegou.
1. Volte a esta issue, atualize a página e aguarde o comentário **Passo 2** da Mona. **Ainda não abra o PR**, mesmo que o GitHub ofereça **Compare & pull request**.

**Resultado esperado:** a branch `welcome-workflow` existe no GitHub, contém `welcome.yml` e a Mona libera o Passo 2. Salvar ou fazer commit sem `git push` não avisa o tutor.

O GitHub CLI (`gh`) já está instalado no runner. Não precisamos obter os arquivos do projeto para publicar esse comentário.

> 🔐 **Segurança:** repare que a URL do PR entra pelo bloco `env` e o script usa `"$PR_URL"`, em vez de escrever {% raw %}`${{ github.event.pull_request.html_url }}`{% endraw %} direto em `run`. O GitHub substitui as expressões {% raw %}`${{ }}`{% endraw %} **antes** de o shell executar o script. Se o valor vier de algo que outra pessoa controla (título do PR, nome de branch, corpo de comentário), ele pode virar um comando: é a [injeção de script](https://docs.github.com/pt/actions/reference/security/secure-use). Pelo `env`, o valor é tratado como dado. Esse é o hábito que você deve levar para qualquer workflow.

<details>
<summary>Precisa de ajuda?</summary>

- Confira o caminho completo: `.github/workflows/welcome.yml`. Um arquivo na pasta errada não dispara a avaliação automática.
- Se `git switch -c welcome-workflow` disser **already exists**, a branch já foi criada. Use `git switch welcome-workflow` e retome a criação/edição do arquivo; não crie uma branch com outro nome.
- Se `git status` mostrar **not a git repository**, você não está na pasta do projeto. No painel **Explorer** do Codespaces, clique com o botão direito na pasta principal do repositório e escolha **Open in Integrated Terminal**.
- Se `git commit` disser **nothing to commit**, confira se salvou o arquivo. Se já havia feito o commit, prossiga para o `git push`.
- Se `git pull --ff-only` ou `git push` falhar, copie a mensagem de erro e peça ajuda. Não use `--force`, não recrie o repositório e não crie um token pessoal.
- Se fechou o Codespaces, abra [Seus codespaces](https://github.com/codespaces) e clique no mesmo ambiente. Confira a branch com `git branch --show-current` antes de continuar.
- O workflow **Boas-vindas** ainda não executou: um commit não é o evento `pull_request`. Quem está verificando o arquivo agora é **Passo 1**.
- YAML usa espaços, não tabulações. `on`, `permissions` e `jobs` ficam no mesmo nível.
- Se errou o conteúdo, corrija no Codespaces, salve e repita `git add .github/workflows/welcome.yml`, `git commit -m "Corrigir boas-vindas"` e `git push`, nessa ordem e na branch `welcome-workflow`.
- Para pedir uma nova avaliação, abra **Actions → Passo 1 → Run workflow**, mantenha `main` e confirme. O tutor verifica a branch `welcome-workflow` mesmo quando executado dessa forma.
- Não edite os workflows numerados nem os arquivos do tutor para corrigir a atividade.

</details>
