# wxt-module-pages

> File-system based routing for WXT browser extensions with multi-framework support.

> File-system based routing for WXT browser extensions with layouts, catch-all routes, route groups, and multi-framework support

Automatically discover all `pages/` directories in your project and generate routes - just like Nuxt, but for browser extensions and with support for Vue, React, Preact, Svelte, Solid.js, Lit, and Angular.

## Features

- 🔍 **Auto-discovery** - Automatically finds all `pages/` directories
- 🎨 **Multi-framework** - Built-in drivers for 7+ frameworks
- 📁 **File-based routing** - Convention over configuration
- 🔄 **Dynamic routes** - Support for `[id]` parameters
- 🌐 **Catch-all routes** - Match any depth with `[...slug]`
- 📂 **Route groups** - Organize with `(folder)` without affecting URLs
- 🎭 **Layouts** - Shared UI with automatic nesting
- 🏗️ **Layers support** - Override routes using directory precedence
- ⚡ **HMR** - Hot module replacement in development
- 🎯 **Type-safe** - Full TypeScript support
- 🪶 **Zero config** - Works out of the box

## Installation

```bash
npm install wxt-module-pages
# or
pnpm add wxt-module-pages
# or
yarn add wxt-module-pages
```

## Quick Start

### 1. Add the module to your `wxt.config.ts`

```typescript
import { defineConfig } from 'wxt'
import pages from 'wxt-module-pages'

export default defineConfig({
  modules: [
    pages()
  ]
})
```

### 2. Create your pages directory

```
entrypoints/popup/pages/
  index.vue          → /
  about.vue          → /about
  users/
    index.vue        → /users
    [id].vue         → /users/:id
```

### 3. Import and use the routes

```typescript
// entrypoints/popup/main.ts
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import routes from 'virtual:routes'
import App from './App.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

createApp(App).use(router).mount('#app')
```

## Framework Usage

### Vue / Nuxt

```typescript
// wxt.config.ts
import pages from 'wxt-module-pages'

export default defineConfig({
  modules: [pages()] // vue is default
})
```

```typescript
// entrypoints/popup/main.ts
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import routes from 'virtual:routes'
import App from './App.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

createApp(App).use(router).mount('#app')
```

### React

```typescript
// wxt.config.ts
import pages, { reactDriver } from 'wxt-module-pages'

export default defineConfig({
  modules: [pages({ driver: reactDriver() })]
})
```

```typescript
// entrypoints/popup/main.tsx
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import routes from 'virtual:routes'

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <Routes>
      {routes.map(route => (
        <Route key={route.path} {...route} />
      ))}
    </Routes>
  </HashRouter>
)
```

### Preact

```typescript
// wxt.config.ts
import pages, { preactDriver } from 'wxt-module-pages'

export default defineConfig({
  modules: [pages({ driver: preactDriver() })]
})
```

```typescript
// entrypoints/popup/main.tsx
import { render } from 'preact'
import { Router, Route } from 'preact-router'
import routes from 'virtual:routes'

render(
  <Router>
    {routes.map(route => (
      <Route 
        key={route.path} 
        path={route.path} 
        component={route.component} 
      />
    ))}
  </Router>,
  document.getElementById('root')!
)
```

### Svelte

```typescript
// wxt.config.ts
import pages, { svelteDriver } from 'wxt-module-pages'

export default defineConfig({
  modules: [pages({ driver: svelteDriver() })]
})
```

```typescript
// entrypoints/popup/main.ts
import { mount } from 'svelte'
import Router from 'svelte-spa-router'
import routes from 'virtual:routes'
import App from './App.svelte'

// convert to svelte-spa-router format
const routeMap = {}
routes.forEach(route => {
  routeMap[route.path] = route.component
})

mount(App, {
  target: document.getElementById('app')!,
  props: { routes: routeMap }
})
```

### Solid.js

```typescript
// wxt.config.ts
import pages, { solidDriver } from 'wxt-module-pages'

export default defineConfig({
  modules: [pages({ driver: solidDriver() })]
})
```

```typescript
// entrypoints/popup/main.tsx
import { render } from 'solid-js/web'
import { Router, Route } from '@solidjs/router'
import routes from 'virtual:routes'

render(
  () => (
    <Router>
      {routes.map(route => (
        <Route path={route.path} component={route.component} />
      ))}
    </Router>
  ),
  document.getElementById('root')!
)
```

### Lit (Web Components)

```typescript
// wxt.config.ts
import pages, { litDriver } from 'wxt-module-pages'

export default defineConfig({
  modules: [pages({ driver: litDriver() })]
})
```

```typescript
// entrypoints/popup/main.ts
import { Router } from '@vaadin/router'
import routes from 'virtual:routes'

const outlet = document.getElementById('outlet')
const router = new Router(outlet)

// load all components
Promise.all(routes.map(route => route.load())).then(() => {
  router.setRoutes(routes)
})
```

### Angular

```typescript
// wxt.config.ts
import pages, { angularDriver } from 'wxt-module-pages'

export default defineConfig({
  modules: [pages({ driver: angularDriver() })]
})
```

```typescript
// entrypoints/popup/main.ts
import { bootstrapApplication } from '@angular/platform-browser'
import { provideRouter } from '@angular/router'
import { AppComponent } from './app.component'
import routes from 'virtual:routes'

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)]
})
```

## Advanced Usage

### Multiple Pages Directories

The module automatically discovers all `pages/` directories in your project:

```
entrypoints/popup/pages/    → found
entrypoints/options/pages/  → found
layers/base/pages/          → found
layers/custom/pages/        → found
```

### Importing Specific Routes

You can import routes from specific directories:

```typescript
// merged routes from all pages directories
import routes from 'virtual:routes'

// specific directory
import popupRoutes from 'virtual:entrypoints/popup/pages'
import optionsRoutes from 'virtual:entrypoints/options/pages'

// layer-specific
import baseRoutes from 'virtual:layers/base/pages'
import customRoutes from 'virtual:layers/custom/pages'
```

### Layer Override System

When using `virtual:routes` (merged routes), later directories override earlier ones:

```
layers/base/pages/index.vue       → base route
layers/custom/pages/index.vue     → overrides base
```

This is perfect for extension variants or themed versions.

### File Naming Conventions

```
index.vue                  → /
about.vue                  → /about
users/index.vue            → /users
users/[id].vue             → /users/:id
posts/[slug]/edit.vue      → /posts/:slug/edit
docs/[...slug].vue         → /docs/:slug(.*)* (catch-all)
(admin)/settings.vue       → /settings (route group)
dashboard/layout.vue       → Wraps all dashboard/* pages
```

### Route Patterns

**Dynamic Routes:**
```
pages/users/[id].vue       → /users/:id
```

**Catch-all Routes:**
```
pages/docs/[...slug].vue   → /docs/:slug(.*)*
```
Matches `/docs/anything/at/all/depths`

**Route Groups (Organizational):**
```
pages/(marketing)/blog.vue    → /blog (not /marketing/blog)
pages/(admin)/settings.vue    → /settings (not /admin/settings)
```
Parentheses folders are ignored in URLs - use them to organize your files!

**Layouts:**
```
pages/dashboard/
  layout.vue               → Parent wrapper component
  overview.vue             → /dashboard/overview
  settings.vue             → /dashboard/settings
```

The layout automatically wraps all sibling pages. Layouts can nest!

### Route Names

Routes are automatically named based on their file path:

```
index.vue                  → 'index'
about.vue                  → 'about'
users/index.vue            → 'users'
users/[id].vue             → 'users-id'
posts/[slug]/edit.vue      → 'posts-slug-edit'
docs/[...slug].vue         → 'docs-slug-all'
(admin)/settings.vue       → 'settings'
```

### Working with Layouts

Layouts let you wrap multiple pages with shared UI (navigation, sidebar, etc.).

**Create a layout:**

```vue
<!-- pages/dashboard/layout.vue -->
<template>
  <div class="dashboard">
    <Sidebar />
    <main>
      <RouterView /> <!-- Child pages render here -->
    </main>
  </div>
</template>
```

**Add child pages:**

```
pages/dashboard/
  layout.vue           → Wraps all children
  overview.vue         → /dashboard/overview
  analytics.vue        → /dashboard/analytics
  settings.vue         → /dashboard/settings
```

All pages in the `dashboard/` folder are automatically wrapped by `layout.vue`!

**Nested layouts:**

```
pages/dashboard/
  layout.vue           → Parent layout
  overview.vue
  users/
    layout.vue         → Nested layout
    index.vue          → /dashboard/users
    [id].vue           → /dashboard/users/:id
```

Layouts can nest infinitely - each subfolder's layout wraps its children.

**Generated routes structure:**

```javascript
{
  path: '/dashboard',
  component: () => import('./dashboard/layout.vue'),
  children: [
    {
      path: 'overview',
      component: () => import('./dashboard/overview.vue')
    },
    {
      path: 'users',
      component: () => import('./dashboard/users/layout.vue'),
      children: [
        {
          path: '',
          component: () => import('./dashboard/users/index.vue')
        },
        {
          path: ':id',
          component: () => import('./dashboard/users/[id].vue')
        }
      ]
    }
  ]
}
```

### Custom Drivers

Create your own driver for custom frameworks or routing setups:

```typescript
import type { PagesDriver } from 'wxt-module-pages'

function myCustomDriver(): PagesDriver {
  return {
    extensions: ['.custom'],
    
    routeToCode(route) {
      return `  {
    path: '${route.path}',
    name: '${route.name}',
    component: () => import('${route.file}')
  }`
    },
    
    wrapRoutes(routeStrings) {
      return `export default [
${routeStrings.join(',\n')}
]`
    }
  }
}

export default defineConfig({
  modules: [
    pages({ driver: myCustomDriver() })
  ]
})
```

## How It Works

1. **Build-time scanning** - The module scans your project for `pages/` directories
2. **File detection** - Only includes directories containing framework-specific files (`.vue`, `.jsx`, etc.)
3. **Virtual modules** - Exposes routes via Vite virtual modules
4. **Route generation** - Generates framework-specific route configurations
5. **HMR support** - Watches for changes and triggers hot reloads

## TypeScript Support

Copy the appropriate type declaration file to your project:

**For Vue (default):**
```bash
cp node_modules/wxt-module-pages/types/virtual-modules.d.ts ./types/
```

**For React:**
```bash
cp node_modules/wxt-module-pages/types/virtual-modules-react.d.ts ./types/virtual-modules.d.ts
```

**For Solid.js:**
```bash
cp node_modules/wxt-module-pages/types/virtual-modules-solid.d.ts ./types/virtual-modules.d.ts
```

**For Angular:**
```bash
cp node_modules/wxt-module-pages/types/virtual-modules-angular.d.ts ./types/virtual-modules.d.ts
```

This provides full type safety for:
```typescript
import routes from 'virtual:routes'
import specificRoutes from 'virtual:entrypoints/popup/pages'
```

See `types/README.md` for more details.

## Configuration

### PagesOptions

```typescript
interface PagesOptions {
  /** Driver to use (defaults to vue) */
  driver?: PagesDriver
}
```

### PagesDriver Interface

```typescript
interface PagesDriver {
  /** File extensions to scan for */
  extensions: string[]
  
  /** Convert a route definition to code string */
  routeToCode(route: RouteDefinition): string
  
  /** Wrap all routes in framework-specific export */
  wrapRoutes(routeStrings: string[]): string
}

interface RouteDefinition {
  path: string
  name: string
  file: string
}
```

## Excluded Directories

The following directories are automatically excluded from scanning:

- `node_modules`
- `.wxt`
- `dist`
- `.nuxt`
- `.output`
- `.next`
- `build`

## Examples

See the `/examples` directory for complete working examples:

- [Vue 3 + Vue Router](./examples/vue)
- [React + React Router](./examples/react)
- [Preact + Preact Router](./examples/preact)
- [Svelte + Svelte SPA Router](./examples/svelte)
- [Solid.js + Solid Router](./examples/solid)

## Why?

Browser extensions often need multiple routed interfaces (popup, options page, side panel). Managing these routes manually is tedious. This module brings the beloved file-system routing from Nuxt to WXT, making extension development faster and more enjoyable.

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT © Dave Stewart
