import { Marp } from '@marp-team/marp-core';
import fs from 'node:fs';
try {
  const marp = new Marp({ html: true, markdown: { breaks: true } });
  const md = fs.readFileSync('public/slides/community-ai-tips-minimal/slides.md', 'utf-8');
  console.log('Rendering slides...');
  const { html } = marp.render(md, { htmlAsArray: true });
  console.log('Rendered successfully, html array length:', html.length);
} catch (e) {
  console.error('Marp error', e);
}
