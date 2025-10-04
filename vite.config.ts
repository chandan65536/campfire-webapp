import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        alias: {
            '~bootstrap': resolve(__dirname, 'node_modules/bootstrap'),
        }
    },
    assetsInclude: ['**/*.gltf','**/*.bin', '**/*.glsl', '**/*.png']
})