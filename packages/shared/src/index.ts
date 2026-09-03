// Rozszerzenia .js są celowe: TypeScript mapuje je na źródła .ts, a emitowany
// kod działa i w CommonJS (API), i w ESM (bundler weba) — bez nich Node ESM
// nie rozwiąże ścieżki.
export * from './types.js';
export * from './seat-layout.js';
export * from './participant-roles.js';
