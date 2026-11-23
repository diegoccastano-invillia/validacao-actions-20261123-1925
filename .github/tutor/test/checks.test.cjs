const assert = require('node:assert/strict');
const { test } = require('node:test');
const checks = require('../checks.cjs');
const { stages, lesson } = require('./fixtures.cjs');

const fixtures = stages();

function allPassed(results) {
  assert.deepEqual(results.filter((row) => !row.passed), []);
}

test('os exemplos das atividades renderizam e atendem às verificações de cada etapa', () => {
  allPassed(checks.welcomeChecks(fixtures.welcome));
  allPassed(checks.ciChecks(fixtures.ci));
  allPassed(checks.artifactChecks(fixtures.artifacts));
  allPassed(checks.deployChecks(fixtures.pages, 'Minha equipe'));
  allPassed(checks.ciChecks(fixtures.final));
  allPassed(checks.compositeChecks(fixtures.final, fixtures.composite));
  assert.ok(lesson(1).includes('](https://codespaces.new/participante/exercicio?quickstart=1)'));
  assert.ok(lesson(1).includes('${{ secrets.GITHUB_TOKEN }}'));
  assert.ok(lesson(3).includes('${{ matrix.node }}'));
  assert.ok(lesson(5).includes('${{ steps.publicar.outputs.page_url }}'));
  for (let step = 1; step <= 6; step++) assert.doesNotMatch(lesson(step), /{%|replace-me/);
});

test('os ci.yml completos dos passos 4 a 6 coincidem com a composição incremental das atividades', () => {
  assert.deepEqual(fixtures.complete.artifacts, fixtures.artifacts);
  assert.deepEqual(fixtures.complete.pages, fixtures.pages);
  assert.deepEqual(fixtures.complete.final, fixtures.final);
});

test('todo checkout das atividades descarta as credenciais e nenhum job pede permissão ampla', () => {
  for (const config of [fixtures.ci, fixtures.complete.artifacts, fixtures.complete.pages,
    fixtures.complete.final]) {
    assert.deepEqual(config.permissions, { contents: 'read' });
    const checkouts = Object.values(config.jobs).flatMap((job) => job.steps)
      .filter((step) => step.uses?.startsWith('actions/checkout@'));
    assert.ok(checkouts.length > 0);
    for (const step of checkouts) assert.equal(step.with?.['persist-credentials'], false);
  }
  assert.match(lesson(1), /PR_URL: \${{ github.event.pull_request.html_url }}/);
  assert.match(lesson(1), /"\$PR_URL"/);
});

test('YAML inválido e arquivo ausente geram uma orientação sem liberar a etapa', () => {
  for (const text of [null, 'jobs: [', '- não é um workflow']) {
    const result = checks.parseFile(text, 'ci.yml');
    assert.equal(result.config, null);
    assert.equal(result.results[0].passed, false);
    assert.ok(result.results[0].tip);
  }
});

test('um CI incompleto não é aceito apenas por se chamar CI', () => {
  const invalid = structuredClone(fixtures.ci);
  invalid.jobs.test.strategy.matrix.node = [24];
  invalid.jobs.test.steps.pop();
  const failed = checks.ciChecks(invalid).filter((row) => !row.passed);
  assert.equal(failed.length, 2);
  invalid.jobs.test.steps = [null, 'npm test', { uses: 24 }];
  assert.equal(checks.ciChecks(invalid).at(-1).passed, false);
});

test('o job que recebe o artefato precisa baixá-lo e conferir um arquivo sem checkout', () => {
  const invalid = structuredClone(fixtures.artifacts);
  invalid.jobs['verify-artifact'].steps = [
    { uses: 'actions/checkout@v7' }, { run: 'echo "Tudo certo"' },
  ];
  assert.equal(checks.artifactChecks(invalid).at(-1).passed, false);
});

test('o deploy exige a variável, a condição e as permissões específicas', () => {
  const invalid = structuredClone(fixtures.pages);
  invalid.jobs.deploy.if = 'always()';
  invalid.jobs.deploy.permissions = { contents: 'write' };
  const results = checks.deployChecks(invalid, '');
  assert.equal(results.filter((row) => !row.passed).length, 3);
});

test('a refatoração exige checkout antes da action e não aceita preparação duplicada', () => {
  const invalid = structuredClone(fixtures.final);
  invalid.jobs.test.steps.reverse();
  invalid.jobs.build.steps.push({ run: 'npm ci' });
  assert.equal(checks.compositeChecks(invalid, fixtures.composite).at(-1).passed, false);
  const badAction = structuredClone(fixtures.composite);
  delete badAction.runs.steps[1].shell;
  assert.equal(checks.compositeChecks(fixtures.final, badAction)[0].passed, false);
});
