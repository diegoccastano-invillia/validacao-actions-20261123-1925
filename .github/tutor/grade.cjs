const {
  readState, findExercise, putComment, currentSha,
} = require('./state.cjs');
const { render } = require('./render.cjs');
const checks = require('./checks.cjs');

async function fileAt(github, context, path, sha) {
  try {
    const { data } = await github.rest.repos.getContent({ ...context.repo, path, ref: sha });
    if (data.type !== 'file' || data.encoding !== 'base64') {
      throw new Error(`Não foi possível ler ${path} como um arquivo de texto.`);
    }
    return Buffer.from(data.content, 'base64').toString('utf8');
  } catch (error) {
    if (error.status !== 404) throw error;
    return null;
  }
}

function runIsCurrent(run, { repository, branch, sha, acceptedRun, attempt }) {
  return run.head_repository?.full_name?.toLowerCase() === repository.toLowerCase() &&
    run.head_branch === branch && run.head_sha === sha && run.event === 'push' &&
    run.name === 'CI' && typeof run.path === 'string' &&
    run.path.split('@')[0] === '.github/workflows/ci.yml' &&
    run.id !== acceptedRun && (!attempt || attempt === run.run_attempt);
}

async function latestRun(github, context, workflow, branch, event, sha) {
  // O endpoint por nome de arquivo pode retornar 404 antes do primeiro merge.
  const runs = await github.paginate(github.rest.actions.listWorkflowRunsForRepo, {
    ...context.repo, branch, event, per_page: 100,
  });
  return runs.find((run) => run.path?.split('@')[0] === `.github/workflows/${workflow}` &&
    (!sha || run.head_sha === sha));
}

async function waitForCommit(github, context, branch, sha, core,
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  for (let attempt = 0; attempt < 30; attempt++) {
    if (sha !== await currentSha(github, context, branch)) return { superseded: true };
    const run = await latestRun(github, context, 'ci.yml', branch, 'push', sha);
    if (run?.status === 'completed') return { run };
    core.info(`Aguardando o CI do commit ${sha.slice(0, 7)}: ${run?.status ?? 'ainda não iniciado'}.`);
    if (attempt < 29) await pause(10000);
  }
  return { timeout: true };
}

async function welcomeResult(github, context, pr) {
  const comments = await github.paginate(github.rest.issues.listComments, {
    ...context.repo, issue_number: pr.number, per_page: 100,
  });
  const run = await latestRun(github, context, 'welcome.yml', 'welcome-workflow', 'pull_request');
  return [
    checks.row('O pull request de welcome-workflow foi integrado à main.',
      pr.merged_at && pr.head.ref === 'welcome-workflow' && pr.base.ref === 'main',
      'Integre o pull request da branch welcome-workflow. Fechá-lo sem merge não conclui a etapa.'),
    checks.row('O workflow publicou o comentário de boas-vindas.',
      comments.some((comment) => comment.user.login === 'github-actions[bot]' &&
        comment.body.includes('<!-- boas-vindas-actions -->')),
      'Confira o comentário no PR. Se faltou, corrija o workflow e feche/reabra o PR antes do merge.'),
    checks.row('O workflow Boas-vindas passou para o commit do PR.',
      run?.head_sha === pr.head.sha && run.conclusion === 'success',
      'Aguarde o check Boas-vindas ficar verde. Depois use Executar workflow no Passo 2, se necessário.'),
  ];
}

function escapeHtml(text) {
  // O avaliador não importa nem executa o código do participante.
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

// O primeiro deploy e o cache do CDN podem levar minutos para refletir o novo commit.
const SITE_ATTEMPTS = 24;
const SITE_INTERVAL_MS = 5000;

async function publishedSite(url, title, sha, fetchPage = fetch, wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms)), attempts = SITE_ATTEMPTS) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    let response;
    try {
      response = await fetchPage(url, { redirect: 'error', signal: AbortSignal.timeout(10000) });
    } catch (error) {
      if (!(error instanceof TypeError) && error.name !== 'TimeoutError') throw error;
    }
    if (response?.ok) {
      const html = await response.text();
      if (html.includes(`<meta name="commit" content="${sha}">`) &&
          html.includes(`<title>${escapeHtml(title.trim())}</title>`)) return true;
    }
    if (attempt < attempts - 1) await wait(SITE_INTERVAL_MS);
  }
  return false;
}

async function deploymentResults(github, context, run, title) {
  const deployments = await github.paginate(github.rest.repos.listDeployments, {
    ...context.repo, sha: run.head_sha, environment: 'github-pages', per_page: 100,
  });
  let deployed = false;
  for (const deployment of deployments) {
    const statuses = await github.paginate(github.rest.repos.listDeploymentStatuses, {
      ...context.repo, deployment_id: deployment.id, per_page: 100,
    });
    if (statuses.some((status) => status.state === 'success')) {
      deployed = true;
      break;
    }
  }
  const results = [checks.row('O environment registra um deployment bem-sucedido deste commit.',
    deployed, 'Aguarde a publicação deste commit em github-pages. Um site de uma execução anterior não basta.')];
  let siteUrl;
  if (deployed) {
    const { data: pages } = await github.rest.repos.getPages(context.repo);
    siteUrl = pages.html_url;
    const url = new URL(siteUrl);
    const expectedHost = `${context.repo.owner.toLowerCase()}.github.io`;
    const supported = url.protocol === 'https:' && url.hostname === expectedHost;
    results.push(checks.row('O site publicado contém SITE_TITLE e o commit desta execução.',
      supported && await publishedSite(siteUrl, title, run.head_sha),
      'Use a URL padrão do GitHub Pages. Se o site ainda mostra a versão anterior, aguarde e execute o Passo atual novamente.'));
  }
  return { results, siteUrl };
}

async function grade({ github, context, core }) {
  const step = Number(process.env.STEP);
  const issue = await findExercise(github, context);
  if (!issue) throw new Error('A issue do exercício não foi encontrada.');
  const state = readState(issue);
  core.setOutput('passed', false);
  // Retoma uma conclusão que gravou a evidência, mas não terminou os comentários finais.
  const resumed = (step === 5 && state.step === 5 && state.completion) ||
    (step === 6 && state.bonus);
  if (resumed) {
    core.setOutput('passed', true);
    core.setOutput('evidence', JSON.stringify(step === 5 ? state.completion : state.bonus));
    return;
  }
  if (state.step !== step || issue.state !== 'open') {
    core.notice('Etapa inativa: a avaliação não alterou o progresso.');
    return;
  }
  const repository = `${context.repo.owner}/${context.repo.repo}`;
  const results = [];
  let evidence;
  let run;
  if (step === 1) {
    const sha = await currentSha(github, context, 'welcome-workflow');
    if (context.eventName === 'push' && context.sha !== sha) {
      core.notice('Um push mais recente substituiu esta tentativa.');
      return;
    }
    evidence = { branch: 'welcome-workflow', sha, run_id: null };
    const file = checks.parseFile(sha ?
      await fileAt(github, context, '.github/workflows/welcome.yml', sha) : null, 'welcome.yml');
    results.push(...file.results);
    if (file.config) results.push(...checks.welcomeChecks(file.config));
  } else if (step === 2) {
    let pr = context.payload.pull_request;
    if (!pr) {
      const { data } = await github.rest.pulls.list({
        ...context.repo, state: 'closed', head: `${context.repo.owner}:welcome-workflow`,
        base: 'main', sort: 'updated', direction: 'desc', per_page: 100,
      });
      pr = data.find((candidate) => candidate.merged_at);
    }
    if (!pr) {
      results.push(checks.row('O pull request do exercício foi mergeado.', false,
        'Abra e integre o PR de welcome-workflow para main.'));
    } else {
      evidence = { branch: 'main', sha: pr.merge_commit_sha, run_id: null };
      results.push(...await welcomeResult(github, context, pr));
    }
  } else {
    const branch = step < 5 ? 'ci-pipeline' : 'main';
    const eventRun = context.payload.workflow_run;
    if (eventRun) {
      ({ data: run } = await github.rest.actions.getWorkflowRun({
        ...context.repo, run_id: eventRun.id,
      }));
    } else if (step < 5) {
      const head = await currentSha(github, context, branch);
      const sha = context.eventName === 'push' ? context.sha : head;
      if (context.eventName === 'push' && sha !== head) {
        core.notice('Um commit mais recente substituiu esta tentativa.');
        return;
      }
      const file = checks.parseFile(sha ?
        await fileAt(github, context, '.github/workflows/ci.yml', sha) : null, 'ci.yml');
      const preflight = [...file.results, ...(file.config ? checks.ciChecks(file.config) : [])];
      if (preflight.some((result) => !result.passed)) {
        return report({ github, context, core }, issue, step, preflight);
      }
      const waiting = await waitForCommit(github, context, branch, sha, core);
      if (waiting.superseded) {
        core.notice('A branch mudou enquanto o CI executava. A nova tentativa avaliará o commit mais recente.');
        return;
      }
      if (waiting.timeout) {
        return report({ github, context, core }, issue, step, [
          checks.row('O CI deste commit terminou dentro do período de espera.', false,
            'Confira se CI está na fila ou falhou ao iniciar. Quando ele terminar, execute o Passo atual novamente.'),
        ]);
      }
      run = waiting.run;
    } else {
      run = await latestRun(github, context, 'ci.yml', branch, 'push');
    }
    if (!run) {
      results.push(checks.row('Existe uma execução de CI nesta branch.', false,
        `Confira .github/workflows/ci.yml, name: CI e o evento push; faça um novo commit em ${branch}.`));
    } else if (!runIsCurrent(run, {
      repository, branch, sha: await currentSha(github, context, branch),
      acceptedRun: state.accepted_run_id, attempt: eventRun?.run_attempt,
    })) {
      if (context.eventName === 'workflow_dispatch') {
        results.push(checks.row('O CI corresponde ao commit atual e ainda não foi usado nesta etapa.',
          false, `Confira name: CI, a sintaxe e os eventos de ci.yml; depois faça um novo commit em ${branch}.`));
      } else {
        core.notice('Esta execução é antiga, já foi usada ou pertence a outra branch. O progresso foi preservado.');
        return;
      }
    } else {
      evidence = { branch, sha: run.head_sha, run_id: run.id, attempt: run.run_attempt };
      const file = checks.parseFile(
        await fileAt(github, context, '.github/workflows/ci.yml', run.head_sha), 'ci.yml');
      results.push(...file.results);
      if (file.config) {
        const config = file.config;
        const jobs = await github.paginate(github.rest.actions.listJobsForWorkflowRunAttempt, {
          ...context.repo, run_id: run.id, attempt_number: run.run_attempt, per_page: 100,
        });
        results.push(...checks.ciChecks(config), ...checks.matrixChecks(jobs, config));
        results.push(checks.row('A execução inteira de CI terminou com sucesso.',
          run.status === 'completed' && run.conclusion === 'success',
          'Abra a execução de CI e o primeiro step que falhou. Corrija a causa e faça outro commit.'));
        if (step >= 4) {
          results.push(...checks.artifactChecks(config));
          const artifacts = await github.paginate(github.rest.actions.listWorkflowRunArtifacts, {
            ...context.repo, run_id: run.id, per_page: 100,
          });
          results.push(checks.row('O artefato site existe nesta execução e o job de conferência passou.',
            artifacts.some((artifact) => artifact.name === 'site' && !artifact.expired &&
              artifact.size_in_bytes > 0) && checks.successfulJob(jobs, config, 'verify-artifact'),
            'Confira o upload no build e o download/test -s no job verify-artifact.'));
        }
        if (step >= 5) {
          const title = process.env.SITE_TITLE;
          results.push(...checks.deployChecks(config, title));
          const success = checks.successfulJob(jobs, config, 'deploy');
          results.push(checks.row('O job deploy passou.', success,
            'Em Settings > Pages, escolha GitHub Actions; depois confira as permissões e os logs do deploy.'));
          if (success && title) {
            const deployed = await deploymentResults(github, context, run, title);
            results.push(...deployed.results);
            evidence.site_url = deployed.siteUrl;
          }
        }
        if (step === 6) {
          const composite = checks.parseFile(await fileAt(github, context,
            '.github/actions/preparar-node/action.yml', run.head_sha), 'preparar-node/action.yml');
          results.push(...composite.results);
          if (composite.config) results.push(...checks.compositeChecks(config, composite.config));
          const pulls = await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, {
            ...context.repo, commit_sha: run.head_sha, per_page: 100,
          });
          results.push(checks.row('O PR da composite action foi mergeado nesta versão.',
            pulls.some((pr) => pr.merged_at && pr.head.ref === 'composite-action' &&
              pr.base.ref === 'main' && pr.merge_commit_sha === run.head_sha),
            'Use a branch composite-action e faça merge do seu PR para main.'));
        }
      }
    }
  }
  await report({ github, context, core }, issue, step, results, evidence);
}

async function report({ github, context, core }, issue, step, results, evidence) {
  const repository = `${context.repo.owner}/${context.repo.repo}`;
  const passed = results.length > 0 && results.every((result) => result.passed);
  const tips = [...new Set(results.filter((result) => !result.passed).map((result) => result.tip))];
  await putComment(github, context, issue, `feedback:${step}`,
    render('.github/templates/step-feedback/step-results-table.md', {
      step_number: step, passed, results, tips, full_repo_name: repository,
      run_url: `https://github.com/${repository}/actions/runs/${context.runId}`,
    }));
  core.setOutput('passed', passed);
  if (passed) {
    core.setOutput('evidence', JSON.stringify(evidence));
  } else {
    core.setFailed('Revise os resultados na issue do exercício e tente novamente.');
  }
}

module.exports = { grade, runIsCurrent, publishedSite, waitForCommit };
