const STATE = /^<!-- actions-exercise:state (.+) -->$/m;
const BOT = 'github-actions[bot]';

function readState(issue) {
  const match = issue.body?.match(STATE);
  if (!match) throw new Error('A issue não contém o estado deste exercício.');
  const state = JSON.parse(match[1]);
  if (!Number.isInteger(state.step) || state.step < 1 || state.step > 7 ||
      typeof state.login !== 'string') {
    throw new Error('O estado do exercício é inválido. Não altere o marcador na issue.');
  }
  return state;
}

function stateMarker(state) {
  return `<!-- actions-exercise:state ${JSON.stringify(state)} -->`;
}

async function findExercise(github, context) {
  const issues = await github.paginate(github.rest.issues.listForRepo, {
    ...context.repo, state: 'all', per_page: 100,
  });
  const matches = issues.filter((issue) => !issue.pull_request &&
    issue.user.login === BOT && STATE.test(issue.body || ''));
  if (matches.length > 1) {
    throw new Error('Há mais de uma issue de exercício. Mantenha apenas uma cópia do exercício por repositório.');
  }
  return matches[0];
}

async function saveState(github, context, issue, state) {
  await github.rest.issues.update({
    ...context.repo, issue_number: issue.number,
    body: issue.body.replace(STATE, () => stateMarker(state)),
  });
}

async function putComment(github, context, issue, key, body) {
  const marker = `<!-- actions-exercise:${key} -->`;
  const comments = await github.paginate(github.rest.issues.listComments, {
    ...context.repo, issue_number: issue.number, per_page: 100,
  });
  const previous = comments.find((comment) => comment.user.login === BOT &&
    comment.body.startsWith(marker));
  const content = `${marker}\n${body}`;
  if (previous) {
    if (previous.body !== content) {
      await github.rest.issues.updateComment({
        ...context.repo, comment_id: previous.id, body: content,
      });
    }
  } else {
    await github.rest.issues.createComment({
      ...context.repo, issue_number: issue.number, body: content,
    });
  }
}

async function currentSha(github, context, branch) {
  try {
    const { data } = await github.rest.git.getRef({
      ...context.repo, ref: `heads/${branch}`,
    });
    return data.object.sha;
  } catch (error) {
    if (error.status !== 404) throw error;
    return null;
  }
}

async function discover({ github, context, core }) {
  const issue = await findExercise(github, context);
  const step = Number(process.env.STEP);
  const state = issue && readState(issue);
  const active = Boolean(issue && issue.state === 'open' &&
    (state.step === step || (step === 6 && state.step === 7 && state.bonus)));
  core.setOutput('active', active);
  if (issue) {
    core.setOutput('issue-number', issue.number);
    core.setOutput('issue-url', issue.html_url);
  }
  if (!active) core.notice('Esta etapa não está ativa. Nenhum comentário será alterado.');
}

module.exports = {
  readState, stateMarker, findExercise, saveState, putComment, currentSha, discover,
};
