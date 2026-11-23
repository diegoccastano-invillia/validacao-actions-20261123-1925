## Passo 2: Acompanhando uma execução

> ⏱ **Tempo estimado:** cerca de 6 minutos.

**Antes de continuar:** a Mona deve ter publicado este Passo 2, e o arquivo `welcome.yml` deve estar no GitHub na branch `welcome-workflow`. Não crie outro Codespaces nem outra branch.

O workflow existe, mas ainda não publicou uma mensagem: ele espera um **pull request**, ou **PR**, uma proposta para levar as alterações de `welcome-workflow` à versão principal, `main`.

### 📖 Conceito: execuções, logs e checks

A cada evento, o GitHub cria uma **execução** do workflow. A aba [Actions](https://docs.github.com/pt/actions/how-tos/monitor-workflows/view-workflow-run-history) mostra essas execuções. Dentro delas, os **logs** são as mensagens que cada etapa produziu, úteis para entender o que aconteceu. Os **checks** são os resultados das verificações exibidos no PR.

- **Queued / In progress** (na fila / em andamento): aguarde.
- **Success**, com marca verde: a execução terminou sem erro.
- **Failure**, com marca vermelha: abra os logs para identificar o problema.

Um check verde informa que a automação passou. **Ele não bloqueia nem autoriza o merge sozinho**: exigir checks antes de integrar depende de regras de proteção.

### ⌨️ Atividade: Abrir o PR e investigar o resultado

**Onde:** na página do seu repositório no GitHub. Deixe a aba do Codespaces aberta para possíveis correções.

1. Abra [Pull requests](https://github.com/{{ full_repo_name }}/pulls) e clique no botão verde **New pull request**.
1. Nos seletores acima da comparação, escolha **base: `main`** e **compare: `welcome-workflow`**.
   - **base** é o destino: onde queremos integrar as alterações.
   - **compare** é a origem: a branch em que trabalhamos.
1. Confira que a comparação mostra `.github/workflows/welcome.yml`. Clique em **Create pull request**.
1. No campo de título, escreva `Adicionar boas-vindas automáticas`. Na descrição, escreva `Cria uma mensagem automática para novos pull requests.`.
1. Clique no botão verde **Create pull request** para confirmar. Você será levado à página do PR; ela tem um número, como `#1`, e o estado **Open**.
1. Na aba **Conversation** dessa página, aguarde o comentário **“Boas-vindas! Este comentário foi publicado pelo GitHub Actions.”**

   > ⏳ **Aguarde:** o comentário costuma aparecer em menos de 1 minuto. Se ainda não apareceu, vá para o próximo item e volte depois.
1. No topo do PR, clique em **Checks**. Selecione **Comentar no pull request**, do workflow **Boas-vindas**. Expanda a linha **Publicar boas-vindas** para ver as mensagens da execução.
1. Para conhecer o outro caminho, abra a aba **Actions** do repositório. No menu à esquerda, clique em **Boas-vindas**; na lista central, abra a execução do seu PR.
1. Dentro da execução, clique no job **Comentar no pull request** e expanda **Publicar boas-vindas**. A execução deve estar verde. O comando pode não mostrar uma mensagem longa no log; o comentário na aba **Conversation** do PR é o efeito que estamos confirmando.

**Atenção:** **Boas-vindas** é a automação que você criou. **Passo 1**, **Passo 2** etc. são as automações da Mona, não a sua entrega.

### ⌨️ Atividade: Integrar a automação

**Merge** significa integrar as alterações de uma branch à outra. Neste caso, o arquivo de boas-vindas passará a fazer parte da `main`.

1. Volte a **Pull requests**, abra o PR `Adicionar boas-vindas automáticas` e clique em **Conversation**.
1. Confirme que o comentário apareceu e o check **Boas-vindas** terminou com sucesso.
1. Role até o quadro de integração, abaixo da conversa. Clique em **Merge pull request** e depois em **Confirm merge**.
1. Confira o estado **Merged**, normalmente em roxo. **Close pull request** apenas fecha a proposta sem integrar; não é o botão desta atividade.
1. Se aparecer **Delete branch**, você pode deixar a branch como está. Não é necessário apagar nada.
1. Volte à issue do exercício, atualize a página e aguarde o comentário **Passo 3**.

**Resultado esperado:** o PR aparece como **Merged**, o arquivo está na `main` do GitHub e a Mona libera o Passo 3. A `main` dentro do Codespaces ainda precisa receber essa atualização; faremos isso com `git pull` no próximo passo.

<details>
<summary>Precisa de ajuda?</summary>

- Se não houve execução, confirme que o arquivo está em `.github/workflows/welcome.yml` e que você abriu um PR, não uma issue.
- Se o log mostra erro de permissão, revise `permissions` e `GH_TOKEN`. Não crie um token pessoal.
- Se **welcome-workflow** não aparece em **compare**, volte ao Codespaces e confirme que executou `git push -u origin welcome-workflow` no Passo 1.
- Se precisar corrigir o workflow, no terminal do Codespaces execute `git switch welcome-workflow` e `code .github/workflows/welcome.yml`. Edite e salve. Depois envie a correção:

  ```bash
  git add .github/workflows/welcome.yml
  git commit -m "Corrigir workflow de boas-vindas"
  git push
  ```

  No PR, clique em **Conversation**, role até o fim e use **Close pull request**, depois **Reopen pull request**. Aqui fechar/reabrir é intencional: o evento `reopened` executa a receita novamente. Um simples push não dispara o workflow **Boas-vindas**.
- Se fez merge antes do check terminar, aguarde-o e solicite nova avaliação em **Actions → Passo 2 → Run workflow → main**.
- Se já integrou um workflow quebrado, peça ajuda para preparar um PR de correção antes de continuar; não altere os workflows **Passo N**.

</details>
