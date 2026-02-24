import { Marp } from '@marp-team/marp-core';
const marp = new Marp({ html: true, markdown: { breaks: true } });
const { html } = marp.render('# Hello', { htmlAsArray: true });
console.log(html[0]);
