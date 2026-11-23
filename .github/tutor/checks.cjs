const YAML = require('yaml');

const NODE_VERSIONS = ['24', '26'];
const LOCAL_ACTION = './.github/actions/preparar-node';

function row(description, passed, tip) {
  return { description, passed: Boolean(passed), tip };
}

function parseFile(text, filename) {
  if (text === null) {
    return { config: null, results: [row(`O arquivo ${filename} existe.`, false,
      `Crie ${filename} na branch indicada na atividade.`)] };
  }
  const document = YAML.parseDocument(text);
  const valid = document.errors.length === 0 && YAML.isMap(document.contents);
  return {
    config: valid ? document.toJS() : null,
    results: [row(`O arquivo ${filename} contém YAML válido.`, valid,
      'Confira a indentação e os blocos YAML da atividade. Não remova os dois-pontos.')],
  };
}

function steps(job) {
  return Array.isArray(job?.steps) ? job.steps.filter((step) =>
    step && typeof step === 'object' && !Array.isArray(step)) : [];
}

function action(job, name) {
  return steps(job).find((step) => typeof step.uses === 'string' &&
    (step.uses === name || step.uses.startsWith(`${name}@`)));
}

function command(job, text) {
  return steps(job).some((step) => typeof step.run === 'string' &&
    step.run.split('\n').some((line) => line.trim() === text));
}

function needs(job, dependency) {
  return job?.needs === dependency ||
    (Array.isArray(job?.needs) && job.needs.includes(dependency));
}

function hasEvent(config, event) {
  const trigger = config.on;
  return trigger === event ||
    (Array.isArray(trigger) && trigger.includes(event)) ||
    (trigger !== null && typeof trigger === 'object' && Object.hasOwn(trigger, event));
}

function welcomeChecks(config) {
  const job = config.jobs?.welcome;
  const permissions = job?.permissions ?? config.permissions;
  const comment = steps(job).find((step) => typeof step.run === 'string' &&
    /\bgh pr comment\b/.test(step.run));
  const types = config.on?.pull_request?.types;
  return [
    row('O workflow Boas-vindas reage à abertura de um pull request.',
      config.name === 'Boas-vindas' && hasEvent(config, 'pull_request') &&
      Array.isArray(types) && types.includes('opened'),
      'Mantenha name: Boas-vindas e o evento pull_request com types: [opened, reopened].'),
    row('O job welcome executa em ubuntu-latest.', job?.['runs-on'] === 'ubuntu-latest',
      'Confira o bloco jobs > welcome > runs-on.'),
    row('O token recebe apenas pull-requests: write.',
      permissions?.['pull-requests'] === 'write' && Object.keys(permissions).length === 1,
      'Use permissions: com apenas pull-requests: write neste workflow.'),
    row('O step comenta usando GitHub CLI e o token automático.',
      comment && typeof comment.env?.GH_TOKEN === 'string' &&
      comment.env.GH_TOKEN.includes('secrets.GITHUB_TOKEN') &&
      comment.run.includes('<!-- boas-vindas-actions -->'),
      'Copie o step de comentário, incluindo GH_TOKEN e o marcador do comentário.'),
  ];
}

function ciChecks(config) {
  const test = config.jobs?.test;
  const versions = test?.strategy?.matrix?.node;
  const local = action(test, LOCAL_ACTION);
  const setup = action(test, 'actions/setup-node') ?? local;
  const nodeVersion = setup?.with?.['node-version'];
  return [
    row('O workflow se chama CI e declara os três eventos.',
      config.name === 'CI' &&
      ['push', 'pull_request', 'workflow_dispatch'].every((event) => hasEvent(config, event)),
      'Use name: CI e os eventos push, pull_request e workflow_dispatch.'),
    row('A matriz inclui Node 24 e 26.',
      Array.isArray(versions) && versions.length === 2 &&
      NODE_VERSIONS.every((version) => versions.map(String).includes(version)),
      'No job test, use strategy.matrix.node: [24, 26].'),
    row('Cada combinação configura a versão da matriz e executa npm test.',
      action(test, 'actions/checkout') && nodeVersion === '${{ matrix.node }}' &&
      (local || command(test, 'npm ci')) && command(test, 'npm test'),
      'Mantenha checkout, setup do Node com matrix.node, instalação e npm test.'),
  ];
}

function artifactChecks(config) {
  const build = config.jobs?.build;
  const verify = config.jobs?.['verify-artifact'];
  const upload = action(build, 'actions/upload-artifact');
  const download = action(verify, 'actions/download-artifact');
  return [
    row('O build aguarda os testes e gera dist/.',
      needs(build, 'test') && command(build, 'npm run build'),
      'O job build precisa de needs: test e do comando npm run build.'),
    row('O build envia o artefato site.',
      upload?.with?.name === 'site' && /^dist\/?$/.test(upload.with.path),
      'Use actions/upload-artifact com name: site e path: dist/.'),
    row('Outro job baixa site e confere index.html sem checkout.',
      needs(verify, 'build') && download?.with?.name === 'site' &&
      download.with.path === 'site' && !action(verify, 'actions/checkout') &&
      command(verify, 'test -s site/index.html'),
      'No job verify-artifact, baixe site para site/ e execute test -s site/index.html.'),
  ];
}

function deployChecks(config, title) {
  const build = config.jobs?.build;
  const deploy = config.jobs?.deploy;
  const environment = deploy?.environment;
  const condition = String(deploy?.if ?? '').replace(/\s/g, '');
  const upload = action(deploy, 'actions/upload-pages-artifact');
  const publish = action(deploy, 'actions/deploy-pages');
  const variables = [config.env, build?.env, ...steps(build).map((step) => step.env)];
  return [
    row('SITE_TITLE está configurada e é passada ao build.',
      typeof title === 'string' && title.trim().length > 0 &&
      variables.some((env) => env?.SITE_TITLE === '${{ vars.SITE_TITLE }}'),
      'Crie a variável de repositório SITE_TITLE e passe vars.SITE_TITLE ao build.'),
    row('O deploy aguarda a verificação e só roda na main.',
      needs(deploy, 'verify-artifact') && condition === "github.ref=='refs/heads/main'",
      "No job deploy, use needs: verify-artifact e if: github.ref == 'refs/heads/main'."),
    row('O deploy usa o environment github-pages e permissões específicas.',
      environment?.name === 'github-pages' &&
      environment.url === '${{ steps.publicar.outputs.page_url }}' &&
      deploy?.permissions?.pages === 'write' && deploy.permissions['id-token'] === 'write',
      'Confira environment, a URL do output e permissions no job deploy.'),
    row('O site é baixado, empacotado para Pages e publicado.',
      action(deploy, 'actions/download-artifact')?.with?.name === 'site' &&
      upload?.with?.path === 'site' && publish?.id === 'publicar',
      'Use download-artifact, upload-pages-artifact e deploy-pages, nesta ordem.'),
  ];
}

function compositeChecks(config, composite) {
  const test = config.jobs?.test;
  const build = config.jobs?.build;
  const compositeSteps = composite?.runs?.steps;
  const setup = action({ steps: compositeSteps }, 'actions/setup-node');
  const install = steps({ steps: compositeSteps }).find((step) => step.run === 'npm ci');
  const validJobs = [test, build].every((job) => {
    const entries = steps(job);
    const checkout = entries.findIndex((step) =>
      typeof step.uses === 'string' && step.uses.startsWith('actions/checkout@'));
    const local = entries.findIndex((step) => step.uses === LOCAL_ACTION);
    return checkout >= 0 && local > checkout &&
      !action(job, 'actions/setup-node') && !command(job, 'npm ci');
  });
  return [
    row('A action é composite e recebe a versão do Node.',
      composite?.runs?.using === 'composite' && composite.inputs?.['node-version'] &&
      setup?.with?.['node-version'] === '${{ inputs.node-version }}' &&
      install?.shell === 'bash',
      'Use runs.using: composite, inputs.node-version e shell: bash no step npm ci.'),
    row('Os jobs test e build usam a action local depois do checkout.',
      validJobs && action(test, LOCAL_ACTION)?.with?.['node-version'] === '${{ matrix.node }}' &&
      NODE_VERSIONS.includes(String(action(build, LOCAL_ACTION)?.with?.['node-version'])),
      'Substitua setup-node e npm ci pela action local nos dois jobs, mantendo checkout antes.'),
  ];
}

function successfulJob(jobs, config, id) {
  const name = config.jobs?.[id]?.name ?? id;
  return jobs.some((job) => job.name === name && job.conclusion === 'success');
}

function matrixChecks(jobs, config) {
  return NODE_VERSIONS.map((version) => {
    const configuredName = config.jobs?.test?.name;
    const name = typeof configuredName === 'string' ?
      configuredName.replace('${{ matrix.node }}', version) : `test (${version})`;
    return row(`Os testes passaram no Node ${version}.`,
      jobs.some((job) => job.name === name && job.conclusion === 'success'),
      'Abra o job de testes com falha. Se o assert mostra meu_site em vez de meu-site, revise src/slugify.js.');
  });
}

module.exports = {
  row, parseFile, welcomeChecks, ciChecks, artifactChecks, deployChecks,
  compositeChecks, successfulJob, matrixChecks,
};
