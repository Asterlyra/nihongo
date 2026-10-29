import { defineConfig,configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'vendor', test: /node_modules/ }] } } } },
  test: { environment: 'node', setupFiles: ['./tests/setup.ts'],exclude:[...configDefaults.exclude,'sites/**'] },
});
