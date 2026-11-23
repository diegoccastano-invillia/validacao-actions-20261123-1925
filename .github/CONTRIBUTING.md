# Manutenção do exercício

## Estrutura

- `steps/1-step.md` a `steps/6-step.md`: instruções em pt-BR, publicadas em uma única issue. Os Passos 1–5 formam o caminho principal; o Passo 6 é um desafio opcional. `steps/x-review.md` é a revisão publicada ao concluir o Passo 5.
- `workflows/0-start-exercise.yml` e os seis workflows numerados: início e eventos do percurso.
- `workflows/find-exercise.yml`, `check-step.yml` e `next-step.yml`: localizam, avaliam e avançam sem repetir a lógica em cada etapa.
- `workflows/start-exercise.yml`, `finish-exercise.yml`, `close-bonus.yml`, `templates/` e `tutor/`: ciclo e feedback locais em pt-BR.
- `../src`, `../site`, `../scripts` e `../test`: projeto do participante.

A estrutura preserva o ciclo do [exercise-template](https://github.com/skills/exercise-template) e as orientações do [exercise-creator](https://github.com/skills/exercise-creator). A implementação local substitui o texto em inglês do toolkit e identifica comentários por marcadores, em vez de editar o último comentário de qualquer autor.

Os três jobs de cada etapa continuam explícitos: localizar a issue, avaliar e publicar a próxima atividade. A publicação depende do sucesso da avaliação. O **Passo 5** chama `finish-exercise.yml`: conclui o exercício, publica a revisão, libera o Passo 6 e mantém a issue aberta. O **Passo 6** chama `close-bonus.yml`, que registra o desafio e fecha a issue.

## Público e ambiente

O material não pressupõe conhecimento de Git, programação ou DevSecOps. O participante usa **um único Codespaces** para editar arquivos e executar Git, e as páginas do GitHub para PRs, Actions e configurações. Não exige instalação local nem execução dos testes no Codespaces: as versões do Node são preparadas nos runners do Actions.

Ao editar uma atividade, explique os termos antes de usá-los, indique **onde** agir (terminal, editor ou página do GitHub) e mostre o resultado esperado. Não deixe apenas "crie uma branch" ou "faça commit": inclua os comandos, o salvamento e o `push`, com nomes de arquivos e branches exatos. Preserve as pausas para o tutor, os merges somente nos momentos indicados e as orientações de cota/encerramento do Codespaces. Use a configuração padrão do Codespaces; não há preparação extra necessária para os comandos Git deste percurso.

## Testar antes de distribuir

```sh
npm ci
npm ci --prefix .github/tutor --ignore-scripts
npm test --prefix .github/tutor
actionlint
npm run build
```

**`npm test` na raiz falha intencionalmente** no caso de `slugify`. No teste do percurso, corrija `_` para `-` em uma cópia: os dois testes devem passar. Não publique a correção no projeto inicial.

Os testes do tutor verificam o conteúdo efetivamente renderizado das atividades, as avaliações negativas e a proteção contra execuções repetidas ou de outra branch. O arquivo de workflow do participante é analisado como dados; o tutor não executa seu código nem baixa seus artefatos.

O tutor vem de `main` e examina os arquivos no commit da execução. Somente as branches do percurso e execuções `push` do próprio repositório são elegíveis. Não adapte esse desenho para executar código de forks com um token de escrita.

Nos Passos 3–4, um `push` nos arquivos da atividade inicia a avaliação, que aguarda o CI **daquele commit** com limite de espera. Isso adapta o padrão de `wait-for-workflow` do toolkit: a busca usa o caminho nas execuções do repositório, pois o endpoint por nome de arquivo pode retornar 404 antes do primeiro merge e o nome cadastrado pode ficar desatualizado após uma correção na branch. Nos Passos 5–6, o CI já está na `main` e o gatilho é `workflow_run`.

Nunjucks renderiza as mensagens. Exemplos com expressões de Actions precisam de blocos `{% raw %}` e `{% endraw %}`. Preserve também os marcadores de estado e de comentário da issue: eles permitem repetir uma avaliação sem duplicar atividades.

Ao alterar um passo, mantenha os tempos estimados (`⏱`) coerentes com a faixa de 50–60 minutos do README, considerando o Codespaces já preparado. Os valores não garantem que uma turma sem experiência conclua dentro desse intervalo. Se editar um bloco `yaml` de `4-step.md`, `5-step.md` ou `6-step.md`, atualize também o `ci.yml` completo do final do passo: um teste confere que ele coincide com a composição incremental. Novos exemplos YAML não devem deslocar os blocos incrementais, e o exemplo completo deve continuar sendo o último bloco YAML de cada um desses passos.

## Preparar a publicação

1. Faça a validação completa em um template descartável e uma cópia dele, incluindo criação do Codespaces na conta do participante, início automático, comandos Git, falha intencional, retomada, artefatos, Pages e o desafio opcional. Confira especialmente `git push` de arquivos em `.github/workflows` e os `git pull --ff-only` após os merges e commits do tutor. Os tempos são estimativas, não medições; revise-os com o feedback de uso.
1. Confirme owner e nome no botão **Copiar exercício** do README.
1. Mantenha o repositório de distribuição marcado como **Template repository**. O gatilho `push` de `workflows/0-start-exercise.yml` inicia o exercício no primeiro commit de cada cópia; no template, o job é ignorado pela condição `is_template`.
1. Habilite **Issues** e GitHub Actions. O caminho do participante usa uma conta pessoal e um repositório público. Confirme antes da aula o acesso e a cota do Codespaces; não oriente a habilitar cobranças para contornar um bloqueio sem discutir o custo.
1. Confira as permissões declaradas pelos workflows e as políticas da conta. Não é necessário recomendar um PAT nem escrita irrestrita por padrão.
1. Revise os links externos. Prefira os caminhos atuais da documentação; os antigos redirecionam.
1. Preserve a licença MIT e a atribuição às referências.

Alterar as configurações ou publicar no repositório real exige aprovação do responsável. Em uma cópia de teste, o início manual pelo **Passo 0** continua disponível até o exercício começar.

## Recuperação

O workflow **Passo 0** é idempotente: não reinicia uma issue que já avançou. Depois de liberar o Passo 1, ele se desabilita para não disputar a fila `tutor-exercicio` a cada push na `main`. Se o início falhar antes disso, ele continua habilitado e pode ser repetido por **Run workflow**. O passo ativo pode ser solicitado por **Run workflow**, usando `main`, sem criar eventos artificiais. Corrija o arquivo do participante antes de pedir a reavaliação.

O estado fica em um marcador na issue criada pelo bot. Nunca use um CI antigo bem-sucedido como substituto da execução mais recente. O Passo 5 guarda a evidência aprovada (`completion`) antes de atualizar o README, e o Passo 6 faz o mesmo com `bonus`. Assim, uma conclusão interrompida pode ser retomada mesmo que o commit do README mude o `sha` de `main`.
