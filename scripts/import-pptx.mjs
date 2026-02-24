import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { parseStringPromise } from 'xml2js';

async function importPptx(pptxPath) {
    const fileName = path.basename(pptxPath, '.pptx');
    const projectSlug = fileName.replace(/\s+/g, '_');
    const outputDir = path.resolve(process.cwd(), 'public/slides', projectSlug);
    const imagesDir = path.join(outputDir, 'images');

    console.log(`Importing ${pptxPath}...`);

    const data = await fs.readFile(pptxPath);
    const zip = await JSZip.loadAsync(data);

    await fs.mkdir(imagesDir, { recursive: true });

    // 1. Get slide order from ppt/presentation.xml
    const presentationXml = await zip.file('ppt/presentation.xml').async('text');
    const presentation = await parseStringPromise(presentationXml);
    const sldIdList = presentation['p:presentation']['p:sldIdLst'][0]['p:sldId'];

    // Map slide IDs to filenames
    const presRelsXml = await zip.file('ppt/_rels/presentation.xml.rels').async('text');
    const presRels = await parseStringPromise(presRelsXml);
    const presRelMap = {};
    presRels.Relationships.Relationship.forEach(r => {
        presRelMap[r.$.Id] = r.$.Target;
    });

    const slideFiles = sldIdList.map(sldId => {
        const rId = sldId.$['r:id'];
        return path.join('ppt', presRelMap[rId]);
    });

    let markdown = `---\nmarp: true\ntheme: default\npaginate: true\n---\n\n`;
    const scripts = [];

    for (let i = 0; i < slideFiles.length; i++) {
        const slideFile = slideFiles[i].replace(/\\/g, '/');
        const slideName = path.basename(slideFile);
        const slideDir = path.dirname(slideFile);
        console.log(`Processing slide ${i + 1}: ${slideFile}`);

        // Check for images in this slide
        const slideRelsFile = `${slideDir}/_rels/${slideName}.rels`;
        let slideImage = null;
        try {
            const relsFile = zip.file(slideRelsFile);
            if (relsFile) {
                const slideRelsXml = await relsFile.async('text');
                const slideRels = await parseStringPromise(slideRelsXml);
                const relationships = Array.isArray(slideRels.Relationships.Relationship)
                    ? slideRels.Relationships.Relationship
                    : [slideRels.Relationships.Relationship];

                const imageRel = relationships.find(r => r.$.Type.includes('image'));
                if (imageRel) {
                    const target = imageRel.$.Target;
                    // Target is usually like "../media/image1.png"
                    const actualImagePath = path.join(slideDir, target).replace(/\\/g, '/').replace(/\/(\.\.\/)+/g, '/').replace('ppt/slides/media', 'ppt/media');

                    // Try to find the file
                    let imageFile = zip.file(actualImagePath);
                    if (!imageFile) {
                        // Fallback: sometimes the path normalization is tricky
                        const mediaName = path.basename(target);
                        imageFile = zip.file(`ppt/media/${mediaName}`);
                    }

                    if (imageFile) {
                        const imageData = await imageFile.async('nodebuffer');
                        const ext = path.extname(target);
                        const newImageName = `slide${i + 1}${ext}`;
                        await fs.writeFile(path.join(imagesDir, newImageName), imageData);
                        slideImage = `images/${newImageName}`;
                    }
                }
            }
        } catch (e) {
            console.warn(`Could not find images for slide ${i + 1}: ${e.message}`);
        }

        // Extract text
        const slideXml = await zip.file(slideFile).async('text');
        const slide = await parseStringPromise(slideXml);

        const paragraphs = [];
        function findParagraphs(obj) {
            if (!obj || typeof obj !== 'object') return;
            if (obj['a:p']) {
                const pList = Array.isArray(obj['a:p']) ? obj['a:p'] : [obj['a:p']];
                pList.forEach(p => {
                    let pText = '';
                    const findT = (o) => {
                        if (!o || typeof o !== 'object') return;
                        if (o['a:t']) {
                            const tList = Array.isArray(o['a:t']) ? o['a:t'] : [o['a:t']];
                            tList.forEach(t => { pText += (typeof t === 'string' ? t : t._ || ''); });
                        }
                        for (const k in o) { if (k !== 'a:p' && Array.isArray(o[k])) o[k].forEach(findT); else if (k !== 'a:p') findT(o[k]); }
                    };
                    findT(p);
                    if (pText.trim()) paragraphs.push(pText.trim());
                });
            }
            for (const key in obj) { if (Array.isArray(obj[key])) obj[key].forEach(findParagraphs); else findParagraphs(obj[key]); }
        }
        findParagraphs(slide);

        if (slideImage) {
            markdown += `![bg contain](/${path.join('slides', projectSlug, slideImage)})\n\n`;
        }

        if (paragraphs.length > 0) {
            const title = paragraphs[0];
            markdown += `# ${title}\n\n`;
            for (let j = 1; j < paragraphs.length; j++) {
                markdown += `- ${paragraphs[j]}\n`;
            }
        } else {
            markdown += `# Slide ${i + 1}\n\n`;
        }

        if (i < slideFiles.length - 1) {
            markdown += `\n---\n\n`;
        }

        scripts.push({
            page: i,
            line: paragraphs.length > 0 ? `スライド${i + 1}「${paragraphs[0]}」について説明します。` : `スライド${i + 1}について説明します。`,
            notes: ""
        });
    }

    await fs.writeFile(path.join(outputDir, 'slides.md'), markdown);
    await fs.writeFile(path.join(outputDir, 'scripts.json'), JSON.stringify(scripts, null, 2));

    console.log(`Successfully imported to ${outputDir}`);
}

const pptxArg = process.argv[2];
if (!pptxArg) {
    console.error('Usage: node import-pptx.mjs <path-to-pptx>');
    process.exit(1);
}

importPptx(pptxArg).catch(console.error);
