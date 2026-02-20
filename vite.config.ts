import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs/promises';
import path from 'node:path';
import formidable from 'formidable';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      'source-map-js': require.resolve('source-map-js/source-map.js'),
    }
  },
  plugins: [
    react(),
    nodePolyfills({
      include: ['path', 'url', 'buffer', 'fs'],
      globals: { process: true, Buffer: true }
    }),
    {
      name: 'file-upload-server',
      configureServer(server) {
        // List images endpoint
        server.middlewares.use('/api/images', async (req, res, next) => {
          if (req.method === 'GET') {
            try {
              const imagesDir = path.resolve(__dirname, 'public/images');
              // Ensure directory exists
              try {
                await fs.access(imagesDir);
              } catch {
                await fs.mkdir(imagesDir, { recursive: true });
              }

              const files = await fs.readdir(imagesDir);
              const imageFiles = files.filter(file => /\.(png|jpe?g|gif|svg|webp)$/i.test(file));

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                images: imageFiles.map(file => ({
                  name: file,
                  url: `/images/${file}`
                }))
              }));
            } catch (error) {
              console.error('Error listing images:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to list images' }));
            }
          } else {
            next();
          }
        });

        // Upload endpoint
        server.middlewares.use('/api/upload', async (req, res, next) => {
          if (req.method === 'POST') {
            try {
              const projectPathRaw = (req.headers['x-project-path'] as string) || '';
              let projectPath = projectPathRaw.replace(/^\/+|\/+$/g, '');
              if (!projectPath) {
                projectPath = 'public';
              } else if (!projectPath.startsWith('public/')) {
                projectPath = 'public/' + projectPath;
              }
              const uploadDir = path.resolve(__dirname, projectPath, 'images');

              await fs.mkdir(uploadDir, { recursive: true });

              const form = formidable({
                uploadDir,
                keepExtensions: true,
                filename: (_name, ext, part, _form) => {
                  // Use original filename, handle duplicates if needed (not implemented here for simplicity)
                  return part.originalFilename || `image_${Date.now()}${ext}`;
                }
              });

              form.parse(req, (err, _fields, files) => {
                if (err) {
                  console.error('Upload error:', err);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Upload failed' }));
                  return;
                }

                const publicPath = projectPath.startsWith('public/') ? projectPath.substring(7) : projectPath;
                const baseUrl = publicPath ? `/${publicPath}/images` : '/images';

                // Helper to flatten files array from formidable and filter undefined
                const fileList = Object.values(files).flat().filter(f => f !== undefined);
                const result = fileList.map(f => ({
                  originalFilename: f?.originalFilename,
                  newFilename: f?.newFilename,
                  url: `${baseUrl}/${f?.newFilename}`
                }));

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ files: result }));
              });
            } catch (err) {
              console.error('Upload directory creation error:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to initialize upload directory' }));
            }
          } else {
            next();
          }
        });

        // Save file endpoint
        server.middlewares.use('/api/save-file', async (req, res, next) => {
          if (req.method === 'POST') {
            const buffers: Buffer[] = [];
            req.on('data', (chunk) => buffers.push(chunk));
            req.on('end', async () => {
              try {
                const body = Buffer.concat(buffers).toString();
                const { path: filePath, content } = JSON.parse(body);

                if (!filePath || content === undefined) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing path or content' }));
                  return;
                }

                // Security check roughly (prevent traversing up too much, though this is dev tool)
                // Allow writing to public/ and potentially other places if needed, but scoping to project root is good.
                const safePath = path.resolve(__dirname, filePath.replace(/^\//, ''));
                if (!safePath.startsWith(__dirname)) {
                  res.statusCode = 403;
                  res.end(JSON.stringify({ error: 'Invalid path' }));
                  return;
                }

                // Ensure directory exists
                await fs.mkdir(path.dirname(safePath), { recursive: true });
                await fs.writeFile(safePath, content, 'utf-8');

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (error) {
                console.error('Save error:', error);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to save file' }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
})
