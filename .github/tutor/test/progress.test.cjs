const assert = require('node:assert/strict');
const { test } = require('node:test');
const { runIsCurrent, publishedSite, grade, waitForCommit } = require('../grade.cjs');
const { putComment, stateMarker, readState, discover } = require('../state.cjs');
const { start, advance, finish, closeBonus } = require('../lifecycle.cjs');
const YAML = require('yaml');
const { stages } = require('./fixtures.cjs');

const context = {
  repo: { owner: 'participante', repo: 'exercicio' },
  runId: 800, actor: 'participante', eventName: 'workflow_run',
};
const sha = 'a'.repeat(40);
const run = {
  id: 100, name: 'CI', path: '.github/workflows/ci.yml',
  head_repository: { full_name: 'participante/exercicio' },
  head_branch: 'ci-pipeline', head_sha: sha,
  event: 'push', status: 'completed', conclusion: 'success', run_attempt: 1,
};
const expected = {
  repository: 'participante/exercicio', branch: 'ci-pipeline', sha, acceptedRun: 90, attempt: 1,
};

function environment(t, key, value) {
  const previous = process.env[key];
  process.env[key] = value;
  t.after(() => {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  });
}

test('não aceita run antigo, de fork, de PR, de outra branch nem tentativa superada', () => {
  assert.equal(runIsCurrent(run, expected), true);
  const changes = [
    { head_sha: 'b'.repeat(40) }, { id: 90 }, { event: 'pull_request' },
    { head_branch: 'outra-branch' }, { run_attempt: 2 },
    { head_repository: { full_name: 'outra-pessoa/exercicio' } },
    { path: '.github/workflows/outro.yml' },
  ];
  for (const change of changes) {
    assert.equal(runIsCurrent({ ...run, ...change }, expected), false);
  }
});

test('uma URL que responde com uma versão antiga não comprova o novo deployment', async () => {
  const old = `<title>Minha equipe</title><meta name="commit" content="${'b'.repeat(40)}">`;
  const current = `<title>Minha &lt;equipe&gt;</title><meta name="commit" content="${sha}">`;
  const page = (html) => async () => ({ ok: true, text: async () => html });
  const noWait = async () => {};
  assert.equal(await publishedSite('https://participante.github.io/exercicio/',
    'Minha equipe', sha, page(old), noWait), false);
  assert.equal(await publishedSite('https://participante.github.io/exercicio/',
    'Minha <equipe>', sha, page(current), noWait), true);
});

function fakeGitHub(state, config = stages().ci) {
  const issue = {
    number: 1, html_url: 'https://github.com/participante/exercicio/issues/1',
    user: { login: 'github-actions[bot]' }, state: 'open',
    body: `${stateMarker({ login: 'participante', ...state })}\nBoas-vindas!`,
  };
  const comments = [
    { id: 2, user: { login: 'participante' }, body: 'Minha pergunta, não substitua.' },
  ];
  const actions = [];
  const outputs = {};
  const failures = [];
  const core = {
    setOutput: (key, value) => { outputs[key] = value; },
    notice: () => {}, info: () => {}, setFailed: (message) => failures.push(message),
  };
  const rest = {
    issues: {
      listForRepo: async () => [issue],
      listComments: async () => comments,
      createComment: async ({ body }) => {
        comments.push({ id: comments.length + 10, user: { login: 'github-actions[bot]' }, body });
      },
      updateComment: async ({ comment_id, body }) => {
        comments.find((comment) => comment.id === comment_id).body = body;
      },
      update: async (update) => { Object.assign(issue, update); },
    },
    git: { getRef: async () => ({ data: { object: { sha } } }) },
    repos: {
      getContent: async () => ({
        data: { type: 'file', encoding: 'base64', content: Buffer.from(YAML.stringify(config)).toString('base64') },
      }),
      createOrUpdateFileContents: async () => { actions.push('readme'); },
    },
    actions: {
      getWorkflowRun: async () => ({ data: run }),
      listWorkflowRunsForRepo: async () => [
        { ...run, id: 101, path: '.github/workflows/outro.yml' }, run,
      ],
      listJobsForWorkflowRunAttempt: async () => [
        { name: 'Testes (Node 24)', conclusion: 'success' },
        { name: 'Testes (Node 26)', conclusion: 'success' },
      ],
      enableWorkflow: async ({ workflow_id }) => { actions.push(`enable:${workflow_id}`); },
      disableWorkflow: async ({ workflow_id }) => { actions.push(`disable:${workflow_id}`); },
    },
  };
  return {
    github: { rest, paginate: async (method, args) => method(args) },
    issue, comments, actions, outputs, failures, core,
  };
}

test('feedback repetido atualiza só o comentário marcado do tutor', async () => {
  const fake = fakeGitHub({ step: 3 });
  await putComment(fake.github, context, fake.issue, 'feedback:3', 'Corrija o teste.');
  await putComment(fake.github, context, fake.issue, 'feedback:3', 'Teste aprovado.');
  assert.equal(fake.comments.length, 2);
  assert.equal(fake.comments[0].body, 'Minha pergunta, não substitua.');
  assert.match(fake.comments[1].body, /Teste aprovado/);
});

test('a avaliação atualiza o feedback mas não avança o estado quando falha', async (t) => {
  environment(t, 'STEP', '3');
  const broken = structuredClone(stages().ci);
  broken.jobs.test.steps.pop();
  const fake = fakeGitHub({ step: 3 }, broken);
  await grade({ ...fake, context: { ...context, payload: { workflow_run: run } } });
  assert.equal(fake.outputs.passed, false);
  assert.equal(readState(fake.issue).step, 3);
  assert.equal(fake.failures.length, 1);
  assert.match(fake.comments[1].body, /precisa de um ajuste/);
});

test('a reavaliação manual encontra um workflow que ainda existe somente na branch do PR', async (t) => {
  environment(t, 'STEP', '3');
  const fake = fakeGitHub({ step: 3 });
  await grade({ ...fake, context: { ...context, eventName: 'workflow_dispatch', payload: {} } });
  assert.equal(fake.outputs.passed, true);
  assert.equal(JSON.parse(fake.outputs.evidence).run_id, run.id);
});

test('aguarda o CI do commit enviado, sem aceitar o sucesso de outro commit', async () => {
  const fake = fakeGitHub({ step: 3 });
  const responses = [
    [{ ...run, head_sha: 'b'.repeat(40) }],
    [{ ...run, status: 'in_progress', conclusion: null }],
    [run],
  ];
  fake.github.rest.actions.listWorkflowRunsForRepo = async ({ branch, event }) => {
    assert.equal(branch, 'ci-pipeline');
    assert.equal(event, 'push');
    return responses.shift();
  };
  const result = await waitForCommit(fake.github, context, 'ci-pipeline', sha,
    fake.core, async () => {});
  assert.equal(result.run.head_sha, sha);
  assert.equal(result.run.conclusion, 'success');
  assert.equal(responses.length, 0);
});

test('interrompe a espera de um commit substituído e não aprova CI que nunca terminou', async () => {
  const fake = fakeGitHub({ step: 3 });
  fake.github.rest.actions.listWorkflowRunsForRepo = async () =>
    [{ ...run, status: 'queued', conclusion: null }];
  assert.deepEqual(await waitForCommit(fake.github, context, 'ci-pipeline', sha,
    fake.core, async () => {}), { timeout: true });
  fake.github.rest.git.getRef = async () => ({ data: { object: { sha: 'b'.repeat(40) } } });
  assert.deepEqual(await waitForCommit(fake.github, context, 'ci-pipeline', sha,
    fake.core, async () => {}), { superseded: true });
});

test('um push com nome de CI incorreto recebe feedback sem esperar um evento workflow_run', async (t) => {
  environment(t, 'STEP', '3');
  const broken = structuredClone(stages().ci);
  broken.name = 'CI incorreto';
  const fake = fakeGitHub({ step: 3 }, broken);
  fake.github.rest.actions.listWorkflowRunsForRepo = async () => {
    throw new Error('Não deve aguardar um workflow com configuração inválida.');
  };
  await grade({ ...fake, context: { ...context, eventName: 'push', sha, payload: {} } });
  assert.equal(fake.outputs.passed, false);
  assert.equal(readState(fake.issue).step, 3);
  assert.equal(fake.failures.length, 1);
  assert.match(fake.comments[1].body, /Use name: CI/);
});

test('uma execução aprovada avança uma vez, mesmo se a transição for repetida', async (t) => {
  environment(t, 'STEP', '3');
  const fake = fakeGitHub({ step: 3 });
  await grade({ ...fake, context: { ...context, payload: { workflow_run: run } } });
  assert.equal(fake.outputs.passed, true);
  environment(t, 'EVIDENCE', fake.outputs.evidence);
  await advance({ ...fake, context });
  const commentsAfter = fake.comments.length;
  await advance({ ...fake, context });
  assert.equal(readState(fake.issue).step, 4);
  assert.equal(fake.comments.length, commentsAfter);
  assert.deepEqual(fake.actions, ['enable:4-step.yml', 'disable:3-step.yml']);
});

test('uma notificação repetida não avalia a etapa seguinte com o mesmo run', async (t) => {
  environment(t, 'STEP', '4');
  const fake = fakeGitHub({ step: 4, accepted_run_id: run.id });
  await grade({ ...fake, context: { ...context, payload: { workflow_run: run } } });
  assert.equal(fake.outputs.passed, false);
  assert.equal(fake.comments.length, 1);
});

const evidence = {
  sha, branch: 'main', run_id: 100, site_url: 'https://participante.github.io/exercicio/',
};
const bot = (fake, key) => fake.comments.filter((comment) =>
  comment.body.startsWith(`<!-- actions-exercise:${key} -->`));

test('o Passo 0 só se desabilita depois de liberar o Passo 1, e não reinicia um exercício em andamento', async () => {
  const fake = fakeGitHub({ step: 1 });
  const enable = fake.github.rest.actions.enableWorkflow;
  fake.github.rest.actions.enableWorkflow = async () => { throw new Error('API indisponível'); };
  await assert.rejects(start({ ...fake, context }));
  assert.ok(!fake.actions.includes('disable:0-start-exercise.yml'));
  fake.github.rest.actions.enableWorkflow = enable;
  await start({ ...fake, context });
  assert.deepEqual(fake.actions.slice(-2), ['enable:1-step.yml', 'disable:0-start-exercise.yml']);
  assert.equal(bot(fake, 'lesson:1').length, 1);

  const ongoing = fakeGitHub({ step: 2 });
  await start({ ...ongoing, context });
  assert.deepEqual(ongoing.actions, []);
});

test('o Passo 5 conclui o exercício, publica a revisão e libera o desafio opcional uma única vez', async (t) => {
  environment(t, 'STEP', '5');
  environment(t, 'EVIDENCE', JSON.stringify(evidence));
  const fake = fakeGitHub({ step: 5, accepted_run_id: 90 });
  await finish({ ...fake, context });
  await finish({ ...fake, context });
  const state = readState(fake.issue);
  assert.equal(state.step, 6);
  assert.deepEqual(state.completion, evidence);
  assert.equal(state.accepted_run_id, evidence.run_id);
  assert.equal(fake.issue.state, 'open');
  for (const key of ['review', 'finished', 'lesson:6', 'feedback:6']) {
    assert.equal(bot(fake, key).length, 1, key);
  }
  assert.match(bot(fake, 'review')[0].body, /Cadeia de suprimentos/);
  assert.match(bot(fake, 'lesson:6')[0].body, /Passo 6 \(desafio opcional\)/);
  assert.deepEqual(fake.actions, [
    'readme', 'enable:6-step.yml', 'disable:5-step.yml', 'disable:0-start-exercise.yml',
  ]);
});

test('a conclusão retoma depois de atualizar o README sem perder a evidência', async (t) => {
  environment(t, 'STEP', '5');
  environment(t, 'EVIDENCE', JSON.stringify(evidence));
  const fake = fakeGitHub({ step: 5, completion: evidence });
  fake.github.rest.git.getRef = async () => ({ data: { object: { sha: 'b'.repeat(40) } } });
  await grade({ ...fake, context });
  assert.equal(fake.outputs.passed, true);
  assert.deepEqual(JSON.parse(fake.outputs.evidence), evidence);
  await finish({ ...fake, context });
  assert.equal(readState(fake.issue).step, 6);
  assert.equal(bot(fake, 'finished').length, 1);
});

test('só o Passo 5 conclui o exercício e só o Passo 6 encerra o desafio', async (t) => {
  environment(t, 'EVIDENCE', JSON.stringify(evidence));
  await assert.rejects(finish({ ...fakeGitHub({ step: 4 }), context }), /Somente o passo 5/);
  await assert.rejects(closeBonus({ ...fakeGitHub({ step: 5 }), context }), /Somente o passo 6/);
  const stale = fakeGitHub({ step: 5 });
  stale.github.rest.git.getRef = async () => ({ data: { object: { sha: 'b'.repeat(40) } } });
  await assert.rejects(finish({ ...stale, context }), /A main mudou/);
  assert.equal(readState(stale.issue).completion, undefined);
});

test('o desafio opcional encerra a issue somente depois do Passo 6', async (t) => {
  environment(t, 'STEP', '6');
  environment(t, 'EVIDENCE', JSON.stringify(evidence));
  const fake = fakeGitHub({ step: 6, completion: evidence });
  await closeBonus({ ...fake, context });
  await closeBonus({ ...fake, context });
  const state = readState(fake.issue);
  assert.equal(state.step, 7);
  assert.deepEqual(state.bonus, evidence);
  assert.equal(fake.issue.state, 'closed');
  assert.equal(bot(fake, 'bonus-finished').length, 1);
  assert.deepEqual(fake.actions, ['readme', 'disable:6-step.yml']);
});

test('o encerramento do desafio retoma com a evidência salva e a ativação segue o estado', async (t) => {
  environment(t, 'STEP', '6');
  environment(t, 'EVIDENCE', JSON.stringify(evidence));
  const fake = fakeGitHub({ step: 6, completion: evidence, bonus: evidence });
  fake.github.rest.git.getRef = async () => ({ data: { object: { sha: 'b'.repeat(40) } } });
  await grade({ ...fake, context });
  assert.deepEqual(JSON.parse(fake.outputs.evidence), evidence);
  await closeBonus({ ...fake, context });
  assert.equal(fake.issue.state, 'closed');

  const active = async (stateStep, extra, step) => {
    process.env.STEP = String(step);
    const other = fakeGitHub({ step: stateStep, ...extra });
    await discover({ ...other, context });
    return other.outputs.active;
  };
  assert.equal(await active(5, { completion: evidence }, 5), true);
  assert.equal(await active(6, { completion: evidence }, 5), false);
  assert.equal(await active(6, { completion: evidence }, 6), true);
  assert.equal(await active(5, {}, 6), false);
  assert.equal(await active(7, { bonus: evidence }, 6), true);
  assert.equal(await active(7, { completion: evidence }, 6), false);
});

test('o site publicado é verificado por alguns minutos antes de reprovar', async () => {
  const current = `<title>Equipe</title><meta name="commit" content="${sha}">`;
  let calls = 0;
  const late = async () => ({
    ok: true, text: async () => (++calls < 20 ? '<title>Antigo</title>' : current),
  });
  const waits = [];
  const wait = async (ms) => { waits.push(ms); };
  assert.equal(await publishedSite('https://participante.github.io/exercicio/', 'Equipe', sha,
    late, wait), true);
  assert.equal(calls, 20);
  calls = -100;
  waits.length = 0;
  assert.equal(await publishedSite('https://participante.github.io/exercicio/', 'Equipe', sha,
    late, wait), false);
  assert.ok(waits.length >= 20 && waits.every((ms) => ms === 5000));
});
