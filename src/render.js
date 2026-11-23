import { slugify } from './slugify.js';

export function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function renderSite(template, { title, commit }) {
  const sections = [
    ['Primeiro workflow', 'Um evento inicia jobs que executam comandos ou actions.'],
    ['Testes automatizados', 'A matriz verifica o projeto em duas versões do Node.js.'],
    ['Entrega contínua', 'O mesmo build passa entre jobs e chega ao GitHub Pages.'],
  ];
  const navigation = sections.map(([name]) =>
    `<a href="#${escapeHtml(slugify(name))}">${escapeHtml(name)}</a>`,
  ).join('\n');
  const content = sections.map(([name, description]) =>
    `<section id="${escapeHtml(slugify(name))}"><h2>${escapeHtml(name)}</h2><p>${escapeHtml(description)}</p></section>`,
  ).join('\n');
  const values = { title: escapeHtml(title), commit: escapeHtml(commit), navigation, content };

  return template.replace(/\{\{ (title|commit|navigation|content) \}\}/g,
    (_, key) => values[key]);
}
