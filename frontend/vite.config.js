import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    define: {
        // Polyfill globals needed by Stellar SDK in browser
        global: "globalThis",
        "process.env": {},
    },
    resolve: {
        alias: {
            buffer: "buffer",
        },
    },
    optimizeDeps: {
        include: ["buffer", "@stellar/stellar-sdk"],
    },
    build: {
        commonjsOptions: {
            transformMixedEsModules: true,
        },
    },
});
