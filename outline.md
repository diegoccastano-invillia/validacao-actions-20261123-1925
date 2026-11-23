# Logistics

- **Exercise Title:** GitHub Actions: do primeiro workflow à entrega contínua
- **Repo URL:** https://github.com/diegoccastano-invillia/getting-started-with-github-actions
- **Experience Level**: Beginner to intermediate
- **Recommended Grouping**: GitHub Actions and automation

### Relationships to other exercises

- **Previous Exercise:** [Introduction to GitHub](https://github.com/skills/introduction-to-github)
- **Next Exercise:** [Publish Docker images](https://github.com/skills/publish-docker-images), [Write JavaScript Actions](https://github.com/skills/write-javascript-actions), and [AI in Actions](https://github.com/skills/ai-in-actions)

---

# Outline

## Story Plot

A equipe mantém um pequeno portal e quer automatizar testes e publicação. O participante constrói a automação aos poucos, começando com um comentário em um pull request e terminando com o site publicado no GitHub Pages, inclusive depois de extrair uma composite action.

## README

**Title:** GitHub Actions: do primeiro workflow à entrega contínua

Aprenda os principais conceitos do GitHub Actions criando workflows que reagem a eventos, testam o projeto e publicam um site estático no GitHub Pages.

### Overview

1. Criar um workflow com evento, job, step e permissões mínimas.
1. Abrir um pull request, acompanhar uma execução e entender logs e checks.
1. Automatizar testes com uma matriz de versões do Node.js e corrigir uma falha.
1. Encadear jobs e transferir arquivos de build com artifacts.
1. Publicar o site no GitHub Pages usando um environment.
1. Reutilizar passos com uma composite action e conhecer reusable workflows como aprofundamento opcional.

### What you will build

Você vai criar um workflow de CI que testa e gera um pequeno site estático, além de publicar o resultado no GitHub Pages. O repositório do exercício já inclui o projeto inicial e um teste que falha até o participante corrigir um bug simples.

### Prerequisites

- [Introduction to GitHub](https://github.com/skills/introduction-to-github) ou familiaridade básica com repositórios, branches e pull requests.
- Nenhuma experiência prévia com GitHub Actions, Node.js ou serviços externos é necessária.
- Conta pessoal e repositório público, com Actions e Pages habilitados.
- O caminho principal funciona pelo navegador, sem instalação local.
- **Formato**: Seis etapas guiadas, com feedback em português brasileiro.

## Step 1 - Creating your first workflow

### Story

A equipe quer cumprimentar quem abre um pull request, sem precisar publicar o comentário manualmente.

### Theory

Um workflow é um arquivo YAML em `.github/workflows` que define quando uma automação roda. Ele contém um ou mais jobs; cada job executa em um runner e contém steps que rodam comandos ou usam actions. `permissions` limita o acesso do `GITHUB_TOKEN` ao que o workflow precisa.

### References

- https://docs.github.com/en/actions/about-github-actions/understanding-github-actions
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

### Activity: Create a pull request welcome workflow

1. Crie uma branch chamada `welcome-workflow`.
1. Crie `.github/workflows/welcome.yml`, com nome `Boas-vindas`, gatilho `pull_request` para PRs abertos ou reabertos, job `welcome` em `ubuntu-latest` e um step que publique um comentário usando GitHub CLI.
1. Declare somente a permissão necessária para comentar no pull request.
1. Faça commit do arquivo na branch `welcome-workflow`.

### Transition

- **Actions Trigger:** `push` na branch `welcome-workflow`, limitado ao arquivo `.github/workflows/welcome.yml`.
- **Grading-Check:** Confirmar que o workflow está no caminho correto e declara o evento, job, runner, permissões e comando para comentar.
- **Recuperação:** Nova avaliação manual de `Passo 1` na `main`, sempre examinando a branch `welcome-workflow`.

## Step 2 - Watching a workflow run

### Story

O workflow está pronto; agora a equipe precisa verificar se ele reage ao evento certo e entender onde investigar uma falha.

### Theory

A aba Actions mostra as execuções e seus logs. Um workflow definido em uma branch pode ser testado nela; depois do merge para a branch padrão, passa a fazer parte do fluxo principal do repositório. Checks associados ao pull request ajudam a equipe a ver o resultado junto com a revisão.

### References

- https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows
- https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests

### Activity: Trigger and inspect the workflow

1. Abra um pull request de `welcome-workflow` para `main`.
1. Confirme que o workflow publicou o comentário e inspecione o job e seus logs na aba Actions.
1. Faça merge do pull request.

### Transition

- **Actions Trigger:** `pull_request` para `main`, tipo `closed`, somente se o PR da branch `welcome-workflow` do próprio repositório foi mergeado.
- **Grading-Check:** Confirmar o merge, o comentário do bot e a execução de boas-vindas bem-sucedida para o commit do PR.
- **Recuperação:** Nova avaliação manual após o check terminar; se necessário, novo PR corretivo de `welcome-workflow`.

## Step 3 - Testing changes with continuous integration

### Story

Antes de aceitar mudanças, a equipe quer executar automaticamente os testes em versões suportadas do Node.js. O projeto inicial contém um bug pequeno que fará o primeiro teste falhar.

### Theory

Eventos como `push` e `pull_request` podem iniciar CI. Actions existentes, como checkout e setup-node, evitam reimplementar tarefas comuns. Uma `matrix` repete o job em Node 24 e 26; `fail-fast: false` permite observar ambas as falhas. `workflow_dispatch` permite execução manual quando o arquivo existir na branch padrão.

### References

- https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows
- https://docs.github.com/en/actions/using-workflows/using-a-matrix-for-your-jobs
- https://github.com/marketplace?type=actions

### Activity: Add a test workflow and fix the failing test

1. Crie a branch `ci-pipeline` a partir de `main` e `.github/workflows/ci.yml`, com nome `CI`, para executar em `push`, `pull_request` e `workflow_dispatch`.
1. Configure um job de testes com checkout, setup do Node.js, uma matriz com duas versões LTS suportadas e o comando de testes do projeto.
1. Faça push, abra um PR de `ci-pipeline` para `main` e deixe-o aberto até o Passo 5. Observe a falha esperada nos checks e nos logs.
1. Corrija o bug identificado no projeto e faça push da mudança.
1. Confirme que todas as combinações da matriz passaram.

### Transition

- **Actions Trigger:** `push` em `ci-pipeline`, limitado ao workflow, fontes, testes e manifests do projeto. O tutor aguarda o CI do commit enviado.
- **Grading-Check:** Confirmar a configuração e os dois jobs da matriz no run recebido, verificando ID, tentativa e commit atual da branch. Falhas geram dicas sem avançar.
- **Recuperação:** Corrigir sintaxe/nome do workflow e fazer novo commit; avaliação manual disponível no `Passo 3`.

## Step 4 - Connecting jobs and sharing artifacts

### Story

Os testes passaram. A equipe quer gerar o site somente depois dos testes e conservar o resultado para inspecionar ou usar em uma etapa posterior.

### Theory

Jobs são independentes e podem rodar em paralelo por padrão. `needs` expressa dependências entre jobs. Artifacts permitem guardar arquivos produzidos por um job e baixá-los em outro job ou depois da execução; não são a mesma coisa que cache de dependências.

### References

- https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/using-jobs
- https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts

### Activity: Build and upload the site artifact

1. Adicione ao workflow um job `build` que dependa do job de testes.
1. Execute o script de build já incluído no projeto para gerar os arquivos do site em `dist/`.
1. Use uma action oficial para enviar `dist/` como artifact chamado `site`.
1. Acrescente `verify-artifact`, dependente de `build`, sem checkout: baixe `site` para `site/` e verifique `test -s site/index.html`.
1. Faça push em `ci-pipeline`, observe o grafo de jobs e inspecione o artifact. Não faça merge ainda.

### Transition

- **Actions Trigger:** `push` em `ci-pipeline`, limitado aos arquivos da atividade. O tutor aguarda o CI do commit enviado, sem depender do nome cadastrado antes do primeiro merge.
- **Grading-Check:** Confirmar dependências, upload, download, arquivo não vazio e sucesso do job consumidor na mesma execução. Não reutilizar o run que concluiu o Passo 3.

## Step 5 - Deploying to GitHub Pages

### Story

A equipe quer disponibilizar o site depois que as mudanças chegam à branch padrão, sem depender de um provedor de nuvem externo.

### Theory

GitHub Pages recebe um artifact empacotado no formato específico de publicação. O nome é configurável: renomear um artifact genérico não muda seu formato. O job de deploy recebe `pages: write` e `id-token: write`; o environment usa o output `page_url`. Secrets guardam valores confidenciais; `SITE_TITLE` é público. Aprovação é um bônus opcional.

### References

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment
- https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication

### Activity: Publish the site with GitHub Pages

1. Configure GitHub Pages para usar GitHub Actions como fonte de publicação.
1. Crie uma variável de repositório chamada `SITE_TITLE` e use-a no build para personalizar o site; ela não é confidencial e não deve ser guardada como secret.
1. Adicione `deploy`, condicionado à branch `main` e dependente de `verify-artifact` (que já depende do build e dos testes).
1. Baixe `site`, empacote com `upload-pages-artifact` e publique com `deploy-pages`. Use um nome por tentativa e registre o output da URL no environment `github-pages`.
1. Limite as permissões de publicação ao job e serialize os deployments com `concurrency`.
1. Observe que o deploy fica ignorado no PR.
1. Faça merge de uma mudança para `main` e acompanhe o deployment na aba Actions e no environment.
1. Abra a URL publicada e confirme que o site está disponível.
1. (Opcional) Se o repositório e a organização oferecerem suporte, configure um revisor obrigatório no environment e observe a pausa até a aprovação.

### Transition

- **Actions Trigger:** `workflow_run` de `CI`, origem `push` em `main`, próprio repositório.
- **Grading-Check:** Confirmar o job, o deployment do commit avaliado e a página contendo `SITE_TITLE` e o identificador desse commit. Uma URL de publicação anterior não basta.
- **Recuperação:** Repetir CI após corrigir configuração do Pages; se apenas a propagação do site atrasar, reavaliar pelo `Passo 5`.

## Step 6 - Reusing steps with a composite action

### Story

Os jobs de teste e build repetem a configuração do Node.js. A equipe quer centralizar esses passos para facilitar a manutenção.

### Theory

Uma composite action empacota uma sequência de steps e pode ser armazenada no próprio repositório. Já um reusable workflow com `workflow_call` reutiliza um workflow ou jobs completos. São mecanismos complementares, adequados a níveis diferentes de reuso.

### References

- https://docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-composite-action
- https://docs.github.com/en/actions/sharing-automations/reusing-workflows

### Activity: Create and use a local composite action

1. Crie a branch `composite-action` a partir da `main` publicada.
1. Crie `.github/actions/preparar-node/action.yml` com `runs.using: composite` e input `node-version`.
1. Mova a configuração do Node e `npm ci` para a action, declarando `shell: bash` no comando.
1. Atualize `test` e `build`, mantendo checkout antes da action local e passando a versão da matriz ou uma versão fixa.
1. Faça push, abra o PR e confirme que os jobs continuam passando.
1. Faça merge para `main` e confira a nova publicação antes de concluir.
1. Consulte reusable workflows como aprofundamento na revisão, fora da avaliação obrigatória.

### Transition

- **Actions Trigger:** `workflow_run` de `CI`, origem `push` em `main`, próprio repositório.
- **Grading-Check:** Confirmar a composite action e seu input, o uso em ambos os jobs, o PR integrado e CI/deployment do novo commit. Reexecutar a publicação do Passo 5 não conclui esta etapa.
- **Conclusão:** Publicar revisão e README em pt-BR, fechar a issue e desativar os workflows numerados do tutor.

## Review

Você criou workflows acionados por eventos, acompanhou execuções, automatizou testes, compartilhou artifacts, publicou um site estático e encapsulou steps repetidos em uma action reutilizável.

- Criar workflows com eventos, jobs, steps e permissões limitadas.
- Usar Marketplace actions, matrizes, dependências entre jobs e artifacts.
- Fazer deploy no GitHub Pages por um environment e aplicar reuso local com composite actions.

### What's next?

- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [Publish Docker images](https://github.com/skills/publish-docker-images)
- [Write JavaScript Actions](https://github.com/skills/write-javascript-actions)
- [AI in Actions](https://github.com/skills/ai-in-actions)
- [GitHub Skills](https://learn.github.com/skills)

# Future Considerations

- Criar um exercício avançado sobre actions JavaScript, releases e publicação no GitHub Container Registry.
- Criar um exercício dedicado a reusable workflows, permissões e compartilhamento de automações entre repositórios.
- Reavaliar a integração com o exercise-toolkit quando ele oferecer localização nativa; o exercício usa templates e ciclo locais em pt-BR.