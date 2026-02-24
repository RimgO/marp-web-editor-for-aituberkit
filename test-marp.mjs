import { Marp } from '@marp-team/marp-core';
try {
  const marp = new Marp({ html: true, markdown: { breaks: true } });
  marp.render('# Hello');
  console.log('Marp works');
} catch (e) {
  console.error('Marp error', e);
}
