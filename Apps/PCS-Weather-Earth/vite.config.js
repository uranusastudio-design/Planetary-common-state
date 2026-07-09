import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
// https://vitejs.dev/config/
export default defineConfig({
    base: '/Planetary-common-state/Apps/PCS-Weather-Earth/',
    plugins: [react(), cesium()],
    server: {
        port: 5173,
    },
});
