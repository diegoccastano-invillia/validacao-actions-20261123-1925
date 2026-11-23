const YAML = require('yaml');
const { render } = require('../render.cjs');

function lesson(step) {
  return render(`.github/steps/${step}-step.md`, {
    login: 'participante', full_repo_name: 'participante/exercicio',
    issue_url: 'https://github.com/participante/exercicio/issues/1',
  });
}

function yamlBlocks(step) {
  return [...lesson(step).matchAll(/```yaml\n([\s\S]*?)\n\s*```/g)]
    .map((match) => YAML.parse(match[1]));
}

function stages() {
  const welcome = yamlBlocks(1)[0];
  const ci = yamlBlocks(3)[0];
  const artifacts = structuredClone(ci);
  Object.assign(artifacts.jobs, yamlBlocks(4)[0]);
  const pages = structuredClone(artifacts);
  const [buildStep, deploy] = yamlBlocks(5);
  Object.assign(pages.jobs.build.steps.find((step) => step.run === 'npm run build'), buildStep[0]);
  Object.assign(pages.jobs, deploy);
  const [composite, testStep, buildLocalStep] = yamlBlocks(6);
  const final = structuredClone(pages);
  final.jobs.test.steps.splice(1, 2, testStep[0]);
  final.jobs.build.steps.splice(1, 2, buildLocalStep[0]);
  // Os blocos <details> "ci.yml completo" ficam por último em cada passo.
  const complete = {
    artifacts: yamlBlocks(4).at(-1), pages: yamlBlocks(5).at(-1), final: yamlBlocks(6).at(-1),
  };
  return { welcome, ci, artifacts, pages, composite, final, complete };
}

module.exports = { stages, lesson };
