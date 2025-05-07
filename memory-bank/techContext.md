# Tech Context: Pixel Combat Arena (Prototype)

**Technologies Used**:
- HTML5
- CSS (with Tailwind CSS classes in `index.html` and custom `style.css`)
- TypeScript
- HTML5 Canvas API
- JavaScript (compiled from TypeScript)

**Development Setup**:
- Project runs locally by opening `index.html` in a modern web browser.
- TypeScript is compiled using `tsc` (configured via `tsconfig.json`) to the `dist/` directory.
- Automated testing is set up using Vitest.

**Dependencies**:
- **Development Dependencies**:
    - `vitest`: Testing framework.
    - `@vitest/ui`: Optional UI for Vitest.
    - `typescript`: TypeScript compiler.
- **Runtime Dependencies**:
    - Tailwind CSS (included via CDN in `index.html`).
    - "Press Start 2P" font (included via Google Fonts CDN in `index.html`).

**Tool Usage Patterns**:
- `tsc` for compiling TypeScript.
- `vitest` commands (`test`, `test:ui`, `coverage`) for running tests.
