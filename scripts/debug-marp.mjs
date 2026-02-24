import { Marp } from '@marp-team/marp-core';
import fs from 'fs';

const markdown = fs.readFileSync('/Users/rimgo/ai-slides-scenario-editor/public/slides/AIDD_Strategic_Transformation/slides.md', 'utf-8');
const marp = new Marp();
const { html } = marp.render(markdown);

import { JSDOM } from 'jsdom';
const dom = new JSDOM(html);
const sections = dom.window.document.querySelectorAll('section');
console.log('Sections count:', sections.length);
sections.forEach((s, i) => {
    console.log(`Section ${i} content start:`, s.innerHTML.substring(0, 100));
});
