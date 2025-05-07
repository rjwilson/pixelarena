// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Allows using describe, it, expect globally without imports
    environment: 'jsdom', // For integration tests to work
  },
});
