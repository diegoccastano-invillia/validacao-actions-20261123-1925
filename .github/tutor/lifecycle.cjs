const { readState, stateMarker, findExercise, saveState, putComment, currentSha } = require('./state.cjs');
const { render } = require('./render.cjs');

const TITLE = 'GitHub Actions: do primeiro workflow à entrega contínua';

function values(context, issue, state) {
  return {
    login: state.login,
    full_repo_name: `${context.repo.owner}/${context.repo.repo}`,
    issue_url: issue.html_url,
  };
}

async function workflow(github, context, step, enable) {
  await github.rest.actions[enable ? 'enableWorkflow' : 'disableWorkflow']({
    ...context.repo, workflow_id: `${step}-step.yml`,
  });
}

async function disableStart(github, context) {
  await github.rest.actions.disableWorkflow({ ...context.repo, workflow_id: '0-start-exercise.yml' });
}

async function writeReadme(github, context, content, message) {
  const { data } = await github.rest.repos.getContent({
    ...context.repo, path: 'README.md', ref: 'main',
  });
  if (Buffer.from(data.content, 'base64').toString() === content) return;
  await github.rest.repos.createOrUpdateFileContents({
    ...context.repo, path: 'README.md', branch: 'main', sha: data.sha,
    message: `${message}\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`,
    content: Buffer.from(content).toString('base64'),
  });
}

async function postLesson(github, context, issue, state, step) {
  const vars = { ...values(context, issue, state), step_number: step };
  await putComment(github, context, issue, `lesson:${step}`,
    render(`.github/steps/${step}-step.md`, vars));
  await putComment(github, context, issue, `feedback:${step}`,
    render('.github/templates/step-feedback/watching-for-progress.md', vars));
}

async function start({ github, context, core }) {
  let issue = await findExercise(github, context);
  if (issue && readState(issue).step !== 1) {
    core.notice('O exercício já começou. O progresso existente foi preservado.');
    return;
  }
  const state = issue ? readState(issue) : { step: 1, login: context.actor, accepted_run_id: null };
  for (let step = 1; step <= 6; step++) await workflow(github, context, step, false);
  if (!issue) {
    const body = render('.github/templates/step-feedback/welcome.md', {
      login: state.login, full_repo_name: `${context.repo.owner}/${context.repo.repo}`,
    });
    ({ data: issue } = await github.rest.issues.create({
      ...context.repo, title: `Exercício: ${TITLE}`, body: `${stateMarker(state)}\n${body}`,
    }));
  }
  await writeReadme(github, context,
    render('.github/templates/readme/exercise-started.md', values(context, issue, state)),
    'Iniciar o exercício');
  await postLesson(github, context, issue, state, 1);
  await workflow(github, context, 1, true);
  // Só depois de liberar o Passo 1: uma falha antes daqui permite repetir o início.
  await disableStart(github, context);
  core.notice(`Exercício preparado: ${issue.html_url}`);
}

async function advance({ github, context, core }) {
  const step = Number(process.env.STEP);
  const evidence = JSON.parse(process.env.EVIDENCE);
  const issue = await findExercise(github, context);
  if (!issue) throw new Error('A issue do exercício não foi encontrada.');
  const state = readState(issue);
  if (state.step !== step) {
    core.notice('Esta etapa já foi processada; nenhum comentário será duplicado.');
    return;
  }
  if (evidence.sha !== await currentSha(github, context, evidence.branch)) {
    core.setFailed('Existe um commit mais recente. Aguarde sua avaliação ou execute o Passo atual novamente.');
    return;
  }
  await workflow(github, context, step + 1, true);
  await postLesson(github, context, issue, state, step + 1);
  await saveState(github, context, issue, {
    ...state, step: step + 1, accepted_run_id: evidence.run_id,
  });
  await workflow(github, context, step, false);
}

async function finish({ github, context, core }) {
  const evidence = JSON.parse(process.env.EVIDENCE);
  const issue = await findExercise(github, context);
  if (!issue) throw new Error('A issue do exercício não foi encontrada.');
  const state = readState(issue);
  if (state.step > 5) {
    core.notice('O exercício já foi concluído; nenhum comentário será duplicado.');
    return;
  }
  if (state.step !== 5) throw new Error('Somente o passo 5 pode concluir o exercício.');
  if (!state.completion) {
    if (evidence.sha !== await currentSha(github, context, 'main')) {
      throw new Error('A main mudou durante a avaliação. Aguarde o novo CI antes de concluir.');
    }
    // Permite retomar a conclusão se uma chamada falhar depois do commit do README.
    await saveState(github, context, issue, { ...state, completion: evidence });
  }
  const vars = { ...values(context, issue, state), site_url: evidence.site_url, bonus_done: false };
  await putComment(github, context, issue, 'review', render('.github/steps/x-review.md', vars));
  await writeReadme(github, context,
    render('.github/templates/readme/exercise-finished.md', vars), 'Concluir o exercício');
  await putComment(github, context, issue, 'finished',
    render('.github/templates/step-feedback/exercise-finished.md', vars));
  await workflow(github, context, 6, true);
  await postLesson(github, context, issue, state, 6);
  await workflow(github, context, 5, false);
  await disableStart(github, context);
  await saveState(github, context, issue, {
    ...state, step: 6, accepted_run_id: evidence.run_id, completion: evidence,
  });
}

async function closeBonus({ github, context, core }) {
  const evidence = JSON.parse(process.env.EVIDENCE);
  const issue = await findExercise(github, context);
  if (!issue) throw new Error('A issue do exercício não foi encontrada.');
  const state = readState(issue);
  if (state.step === 7) {
    await github.rest.issues.update({ ...context.repo, issue_number: issue.number, state: 'closed' });
    core.notice('O desafio já está concluído.');
    return;
  }
  if (state.step !== 6) throw new Error('Somente o passo 6 pode encerrar o desafio.');
  if (!state.bonus) {
    if (evidence.sha !== await currentSha(github, context, 'main')) {
      throw new Error('A main mudou durante a avaliação. Aguarde o novo CI antes de concluir.');
    }
    // Permite retomar o encerramento se uma chamada falhar depois do commit do README.
    await saveState(github, context, issue, { ...state, bonus: evidence });
  }
  const vars = { ...values(context, issue, state), site_url: evidence.site_url, bonus_done: true };
  await writeReadme(github, context,
    render('.github/templates/readme/exercise-finished.md', vars), 'Concluir o desafio opcional');
  await putComment(github, context, issue, 'bonus-finished',
    render('.github/templates/step-feedback/bonus-finished.md', vars));
  await workflow(github, context, 6, false);
  await saveState(github, context, issue, {
    ...state, step: 7, accepted_run_id: evidence.run_id, bonus: evidence,
  });
  await github.rest.issues.update({ ...context.repo, issue_number: issue.number, state: 'closed' });
}

module.exports = { start, advance, finish, closeBonus, values };
