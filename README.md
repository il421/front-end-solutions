# Front-End Solutions

A collection of framework-agnostic, TypeScript-first packages for modern web development.

## Packages

### [@front-end-solutions/fetch-api-client](./packages/fetch-api-client)

A lightweight HTTP client built on the native Fetch API with composable middleware pipeline, built-in authentication, and zero framework coupling.

**Key features:**
- 🔗 Composable middleware for request/response interception
- 🔑 Built-in authorization with Bearer token injection
- 🏗️ Multi-API schema support for complex microservice architectures
- 🧩 Per-endpoint middleware overrides
- ⚡ Works with React, Angular, Vue, Node.js 18+, Deno, and Bun
- 📦 Tiny ESM bundle with minimal dependencies

[View documentation →](./packages/fetch-api-client/README.md)

## Getting Started

Each package is independently versioned and can be installed separately:

```bash
npm install @front-end-solutions/fetch-api-client
```

## Development

This is an Nx monorepo. Common commands:

```bash
# Install dependencies
npm install

# Build all packages
nx run-many --target=build

# Run tests
nx run-many --target=test

# Build specific package
nx run @front-end-solutions/fetch-api-client:build
```

## License

MIT
