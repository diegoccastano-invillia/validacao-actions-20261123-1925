# GitHub Actions: do primeiro workflow à entrega contínua

_Automatize testes, compartilhe artefatos e publique um site no GitHub Pages._

## Boas-vindas

- **Para quem é este exercício:** pessoas que estão começando. Você não precisa conhecer Git, programação, GitHub Actions ou DevSecOps.
- **Nível:** introdutório, com comandos para copiar e instruções de onde clicar.
- **Duração estimada:** de 50 a 60 minutos para os cinco passos, com o Codespaces pronto. Prepare o acesso antes da janela de 40–60 minutos do treinamento. Quem nunca usou essas ferramentas pode precisar de mais tempo; as estimativas não foram medidas com uma turma. O Passo 6 é opcional e acrescenta cerca de 12 minutos.
- **Onde você trabalhará:** no **GitHub Codespaces**, um ambiente com editor e terminal que abre no navegador. Não é necessário instalar Git, Node.js ou um editor no seu computador.
- **O que você aprenderá:** eventos, jobs, steps, permissões, logs, testes em matriz, dependências entre jobs, artefatos, environments e noções de segurança (permissão mínima, injeção de script e cadeia de suprimentos). No desafio opcional, reuso com uma composite action.
- **O que você construirá:** o CI e a publicação de um pequeno portal de equipe. O projeto inicial já está incluído; um teste contém uma falha intencional para você investigar.
- **Pré-requisitos:**
  - Uma conta pessoal do GitHub e um repositório **público** para fazer o exercício.
  - Acesso a GitHub Codespaces, GitHub Actions e GitHub Pages nessa conta.
  - Cota disponível para usar o Codespaces. Contas pessoais têm uma franquia, mas o uso não é ilimitado: confira [consumo e cobrança](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces). Se houver bloqueio ou cobrança inesperada, peça ajuda antes de continuar.
  - Um navegador e conexão com a internet.
- **Ritmo:** cinco etapas guiadas e um desafio opcional. Aguarde o feedback da Mona antes de começar a próxima.

**Git** registra versões dos arquivos. **GitHub** hospeda o projeto e permite colaborar. **GitHub Actions** executa tarefas automaticamente. **DevSecOps** é a prática de integrar desenvolvimento, segurança e operação do software; aqui veremos um exemplo pequeno: testar uma alteração e publicá-la com permissões limitadas. Não é preciso decorar esses nomes para começar.

Neste exercício, você vai:

1. Criar seu primeiro workflow.
1. Abrir um pull request e acompanhar uma execução.
1. Configurar testes em duas versões do Node.js e corrigir uma falha.
1. Gerar o site e transferir seus arquivos entre jobs.
1. Publicar o site no GitHub Pages.
1. _(Desafio opcional)_ Extrair uma composite action e publicar novamente.

### Como iniciar

Um **repositório** é a pasta do projeto no GitHub, junto com seu histórico. Este repositório é um **template**: um modelo do qual cada participante criará sua própria cópia.

1. Entre no GitHub com sua conta pessoal.
1. Clique no botão **Copiar exercício** abaixo.
1. Na página que abrir, em **Owner** (dono), selecione **sua conta**, não `dev-pods`.
1. Em **Repository name** (nome), mantenha `meu-primeiro-github-actions` ou escolha um nome disponível.
1. Escolha **Public** (público). Não coloque senhas ou dados pessoais nos arquivos do exercício.
1. Clique em **Create repository** (criar repositório) e aguarde abrir a sua cópia.
1. No topo da nova página, confira que aparece **seu usuário / nome escolhido**.
1. Clique na aba **Issues**. Uma issue é uma página de conversa; a Mona, nosso tutor automático, publicará ali as instruções e os resultados.
1. Aguarde aparecer **Exercício: GitHub Actions...** e clique no título. Role até o comentário **Passo 1**. Ele explica como abrir o Codespaces, usar o terminal e criar a primeira branch.

**Não escolha “Open in a codespace” diretamente no template de `dev-pods`.** Primeiro crie o seu repositório pelo botão abaixo; o tutor e os comandos precisam trabalhar na sua cópia.

[![Copiar exercício](https://img.shields.io/badge/Copiar%20exerc%C3%ADcio-%E2%86%92-1f883d?style=for-the-badge&logo=github&labelColor=197935)](https://github.com/new?template_owner=dev-pods&template_name=getting-started-with-github-actions&owner=%40me&name=meu-primeiro-github-actions&description=Exercicio+pratico+de+GitHub+Actions&visibility=public)

<details>
<summary>Precisa de ajuda para iniciar?</summary>

- Faça o exercício na **sua cópia**, não no repositório que distribui o template.
- Se a issue não aparecer alguns minutos depois de criar a cópia, abra nela **Actions → Passo 0 → Run workflow**, selecione `main` e confirme. Isso significa **executar o workflow**. Se a aba solicitar autorização para usar Actions, habilite-a primeiro.
- **Run workflow** abre um menu: deixe **Branch: main** e clique no botão verde **Run workflow** dentro desse menu.
- Aguarde o workflow terminar. Atualize o README ou abra **Issues** e procure a issue **Exercício: GitHub Actions...**.
- Os workflows **Passo N** são o tutor. Durante as atividades, você trabalhará nos workflows **Boas-vindas** e **CI**.
- Travou? Leia a tabela de resultados da Mona na issue e a seção **Precisa de ajuda?** do passo. Se continuar sem avançar, chame a pessoa que conduz o treinamento e informe o número do passo, a branch e o link da execução em **Actions**.
- Não é necessário criar um token pessoal nem mudar a permissão padrão da conta para escrita. Cada workflow declara suas próprias permissões.
- Repositórios privados e contas corporativas podem ter limitações ou políticas diferentes e não são o caminho deste exercício.
- Se já criou seu Codespaces, volte ao mesmo ambiente em [Seus codespaces](https://github.com/codespaces). Não crie um novo ambiente a cada passo.

</details>

### Ao terminar

Depois de enviar suas alterações com `git push`, abra [Seus codespaces](https://github.com/codespaces), localize o ambiente deste exercício, clique em **… → Stop codespace**. Fechar a aba não o para imediatamente. Parado, ele ainda ocupa armazenamento; exclua-o por **… → Delete** somente depois de conferir seus arquivos no GitHub. Parar o Codespaces não desliga o site publicado no Pages.

---

Baseado no [GitHub Skills exercise-template](https://github.com/skills/exercise-template) e nos padrões do [exercise-creator](https://github.com/skills/exercise-creator). Consulte as [orientações de manutenção](.github/CONTRIBUTING.md) para preparar a distribuição.

Copyright (c) GitHub, Inc. · [Licença MIT](LICENSE) · [Código de Conduta](https://www.contributor-covenant.org/pt-br/version/2/1/code_of_conduct/)
