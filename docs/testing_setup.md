# Setting up Vitest for Automated Testing

Vitest is a fast and modern testing framework that's well-suited for TypeScript projects. Here's how to add it to your current project structure:

**1. Install Vitest:**

Open your project's root directory in your terminal and run the following command. (This assumes you have Node.js and npm/yarn/pnpm installed).

Using npm:
```bash
npm install --save-dev vitest @vitest/ui
```

Using yarn:
```bash
yarn add --dev vitest @vitest/ui
```

Using pnpm:
```bash
pnpm add --save-dev vitest @vitest/ui
```
(`@vitest/ui` provides a nice browser-based UI for viewing test results, which is optional but helpful.)

**2. Configure Vitest (Optional but Recommended):**

You can add a `vitest.config.ts` file to your project root for more advanced configurations. For our current setup, Vitest often works out-of-the-box with minimal configuration if your `tsconfig.json` is set up for ES modules.

A simple `vitest.config.ts` might look like this if you need to specify globals or environment (though often not needed for basic tests with JSDOM for browser-like environment if testing DOM interactions, which we aren't heavily doing in core logic yet):

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Optional: to use describe, it, expect globally without imports
    // environment: 'jsdom', // Optional: if you were testing DOM-related things directly
    // setupFiles: ['./src/tests/setup.ts'], // Optional: for global test setup
  },
});
```
For our current tests focusing on pure logic, `globals: true` is convenient.

**3. Add Test Scripts to `package.json`:**

Open your `package.json` file and add the following scripts:

```json
{
  "scripts": {
    "dev": "vite", // If you were using Vite for development
    "build": "tsc && vite build", // If using Vite
    "preview": "vite preview", // If using Vite
    "test": "vitest",
    "test:ui": "vitest --ui",
    "coverage": "vitest run --coverage" // To generate coverage reports
  }
  // ... other configurations like dependencies
}
```
*If you don't have a `package.json` yet, you can create one by running `npm init -y` (or the equivalent for yarn/pnpm) in your project root.* For this project, since we are compiling with `tsc` and running directly, you might not have `vite` dev/build scripts unless you choose to integrate Vite later. The `test` scripts are the important ones here.

**4. Create a Test Directory:**

It's good practice to keep your test files separate. Create a `tests` directory inside your `src` directory (e.g., `src/tests/`). Test files typically end with `.test.ts` or `.spec.ts`.

For example: `src/tests/combat.test.ts`

**Structure of a Test File:**

Vitest uses a syntax similar to Jest and other popular testing frameworks:

* `describe(name, fn)`: Groups related tests together.
* `it(name, fn)` or `test(name, fn)`: Defines an individual test case.
* `expect(value).toBe(expectedValue)`: An assertion that checks if a value is what you expect. Vitest provides many other matchers (e.g., `toEqual`, `toBeTruthy`, `toContain`).
* `beforeEach(fn)`, `afterEach(fn)`, `beforeAll(fn)`, `afterAll(fn)`: Hooks to run setup or teardown code.

Now you're ready to write and run tests!

