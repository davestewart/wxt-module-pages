# WXT Pages

> File-system based routing for WXT browser extensions

## Abstract

### Overview

WXT Pages brings file-based routing to [WXT](https://wxt.dev):

```yaml
/pages
  /index.vue        → /
  /about.vue        → /about 
  /contact.vue      → /contact
  /items
    /[id].vue       → /items/:id
    /[id]
      /edit.vue     → /items/:id/edit
```

The aim is to make pages and routing as idiomatic and automated as entry point generation.

### Need

In a smaller project, with minimal state or UI, you probably won't need routing.

But in larger extensions which need to model more complex state, views, navigation and data-fetching, routing is a robust and well-known paradigm which solves multiple problems by codifying state (`location`, `parameters`, `query`) into the popup, panel or page URL:

```
chrome-extension://<extension-id>/sidebar.html#/users/123/edit?tab=profiile
```

Whilst routing can be [configured manually](https://router.vuejs.org/guide/#Creating-the-router-instance), file-based routing should feel second-nature if you're used to working in [Next](https://nextjs.org/docs/pages/getting-started/project-structure), [Nuxt](https://nuxt.com/docs/4.x/directory-structure/app/pages), [Svelte](https://svelte.dev/docs/kit/routing), or any other file-based routing framework.

### Features

WXT Pages takes inspiration from the main frontend frameworks and sprinkles in additional functionality to build an extremely robust routing solution:

- **Rich routing syntax**: including parameters, slugs, groups, indexes, layouts and more
- **Framework support**: built-in drivers for Vue, React, Preact, Svelte, Solid and Angular
- **Great DX**: auto-discovery, routes generation, file watching and HMR

## Contents

Quickly jump to:

- [Setup](#setup)<br>
  Install and configure the module, create your first pages, and configure your router
- [Routing](#routing)<br>
  Leverage the rich routing syntax, supporting data, layouts, nested views, ignored folders, etc
- [Advanced](#advanced)<br>
  Patterns and best practices to simply working with larger extensions 
- [Drivers](#drivers)<br>
  Information on how individual framework drivers generate their routes

## Setup

> [!NOTE]
>
> Documentation examples are mainly in Vue. For your preferred framework install the correct driver and adjust accordingly.

### Overview

To get up and running with pages, complete the following steps:

- [Install package](#installation)<br>
  To add the functionality to your project
- [Configure module](#module-configuration)<br>
  To wire up watching, route generation, etc
- [Create page components](#files-setup)<br>
  To allow the router to display content
- [Configure framework router](#router-setup)<br>
  To configure your frontend framework router

### Installation

Install via your preferred package manager:

```bash
npm install wxt-module-pages
```

### Module Configuration

Add the module to your `wxt.config.ts`:

```ts
import { defineConfig } from 'wxt'

export default defineConfig({
  modules: [
    'wxt-module-layers', // vue driver is used by default
  ]
})
```

Additional configuration options are as follows:

```ts
import { reactDriver, angularDriver, ... } from 'wxt-module-pages'

export default defineConfig({
  ...
  pages: {
    // generate routes for React, Angular, etc.
    driver: reactDriver(),
    
    // trace debug output for build and watch
    logLevel: 'debug'
    
    // don't watch pages folders for new files
    watch: false,
  }
})
```

### Files Setup

#### Overview

Set up a `pages/` folders at any of these locations:

```yaml
pages/                          # global pages
entrypoints/*/pages/            # entrypoint-specific pages
layers/*/pages/                 # layer pages
layers/*/entrypoints/*/pages/   # layer entrypoint-specific pages
```

> See [wxt-module-layers](https://github.com/davestewart/wxt-module-layers) for information on layers

Then, add individual page components:

```
pages/
  index.vue
  about.vue
  settings.vue
```

This basic example generates three routes: `/`, `/about`, and `/settings`.

### Router Setup

#### Overview

The module exposes routes via virtual modules that you import in your entrypoint's main file:

- routes are generated at build time and updated automatically during development
- unless otherwise configured all page files are added to the `global` route scope

#### Setup

In your application's main entry point:

```ts
// entrypoints/popup/main.ts
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import routes from 'wxt-module-pages:routes/global'
import App from './App.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

createApp(App).use(router).mount('#app')
```

In the mounted component:

```vue
<!-- entrypoints/popup/App.vue -->
<template>
  <h1>My app</h1>
  <ul>
    <li><router-link to="/">Home</router-link></li>
    <li><router-link to="/about">About</router-link></li>
    <li><router-link to="/settings">Settings</router-link></li>
  </ul>
  <RouterView />
</template>
```

Note that you can configure multiple, separate, route scopes, which is covered later.

## Routing

### Overview

> This section digs into the rich routing syntax used by the module.

The routing system is inspired by [Nuxt](https://nuxt.com/docs/guide/directory-structure/pages) and [SvelteKit](https://kit.svelte.dev/docs/routing), with additions tailored for browser extensions:

- **@scoped routes** - Organize files by entrypoint while controlling which scope they export to
- **Flat route syntax** - Use underscores (`users_[id]_edit.vue`) as an alternative to nested folders
- **Multiple entrypoints** - Automatically discover routes in `entrypoints/*/pages/`

**How it works:**

1. At build time, the module scans your project for `pages/` directories
2. Files are converted to routes based on naming conventions
3. Routes are generated as virtual modules using framework-specific drivers
4. You import the routes in your entrypoint and pass them to your router

### Naming Conventions

Contents:

- [Standard Pages](#standard-pages)
- [Nested Routes](#nested-routes)
- [Dynamic Parameters](#dynamic-parameters)
- [Catch-all Routes](Catch-#all-routes)
- [Flat Route Format](#flat-route-format)
- [Route Groups](#route-groups)
- [Layouts](#layouts)
- [Index Routes](#index-routes)
- [Ignored Files](#ignored-files)
- [Scoped Pages](#scoped-pages)

#### Standard Pages

Regular files become routes:

```yaml
pages/index.vue          → /
pages/about.vue          → /about
pages/contact.vue        → /contact
```

#### Nested Routes

Folders create path segments:

```yaml
pages/users/index.vue    → /users
pages/users/profile.vue  → /users/profile
pages/blog/posts.vue     → /blog/posts
```

#### Dynamic Parameters

Square brackets create dynamic route segments:

```yaml
pages/users/[id].vue           → /users/:id
pages/posts/[slug].vue         → /posts/:slug
pages/docs/[category]/[id].vue → /docs/:category/:id
```

Access parameters in your component:

```vue
<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
console.log(route.params.id)
</script>
```

#### Catch-all Routes

Triple dots create catch-all routes that match any depth:

```yaml
pages/docs/[...slug].vue  → /docs/:slug(.*)*
```

Matches:
- `/docs/guide`
- `/docs/guide/getting-started`
- `/docs/api/reference/methods`

#### Flat Route Format

Use underscores as an alternative to nested folders:

```yaml
pages/users_[id]_edit.vue        → /users/:id/edit
pages/blog_posts_[slug].vue      → /blog/posts/:slug
pages/docs_[...slug].vue         → /docs/:slug(.*)*
```

This is useful when you prefer a flatter file structure or want to avoid deep nesting.

#### Route Groups

Parentheses create organizational folders without affecting the URL:

```yaml
pages/(marketing)/about.vue     → /about
pages/(marketing)/pricing.vue   → /pricing
pages/(admin)/settings.vue      → /settings
pages/(admin)/users.vue         → /users
```

The `(marketing)` and `(admin)` folders don't appear in the routes - they're just for organization.

#### Layouts

Special layout files wrap all routes in the same directory (see [Layouts](#layouts)):

**For Vue (default):**

```yaml
pages/dashboard/+layout.vue     → Wraps all dashboard/* routes
pages/dashboard/overview.vue    → /dashboard/overview
pages/dashboard/settings.vue    → /dashboard/settings
```

Your `+layout.vue` component should look something like this::

```vue
<!-- pages/dashboard/+layout.vue -->
<template>
  <div class="dashboard">
    <Sidebar />
    <main>
      <slot />  <!-- Child routes render here -->
    </main>
  </div>
</template>
```

Layouts can nest infinitely - each subfolder can have its own layout.

#### Index Routes

Index route files create nested route structures (see [Indexes](#indexes)):

**For Vue:**

```yaml
pages/dashboard/+index.vue      → Creates parent route with children
pages/dashboard/index.vue       → Default child route
pages/dashboard/overview.vue    → Child route
```

This generates:

```javascript
{
  path: '/dashboard',
  component: () => import('./dashboard/+index.vue'),
  children: [
    {
      path: 'index',
      component: () => import('./dashboard/index.vue')
    },
    {
      path: 'overview',
      component: () => import('./dashboard/overview.vue')
    }
  ]
}
```

Your `+index.vue` component should look something like this:

```vue
<!-- pages/dashboard/+layout.vue -->
<template>
  <div class="dashboard">
    <Sidebar />
    <main>
      <router-view />  <!-- Child routes render here -->
    </main>
  </div>
</template>
```

#### Ignored Files

Folders or files starting with `_` or `.` are ignored:

```yaml
pages/_components/Button.vue     → ignored
pages/.drafts/feature.vue        → ignored
```

#### Scoped Pages

Use `@scope` to override the default scope (see [scopes](#scopes)):

```yaml
entrypoints/popup/pages/
  index.vue              → scope: 'popup'
  @global/
    shared.vue           → scope: 'global'
  @options/
    common.vue           → scope: 'options'
```

Pages will then generate routes in the specified scope.

Scoped routes can be imported like so:

```ts
// Import global routes
import routes from 'wxt-module-pages:routes/global'

// Import all routes for a specific scope
import routes from 'wxt-module-pages:routes/popup'

// Import from the index and destructure
import { global, popup, options } from 'wxt-module-pages:routes'
```

### Example

Here's a complete example showing all conventions:

```yaml
entrypoints/popup/pages/
  index.vue                        → / (name: 'index')
  about.vue                        → /about (name: 'about')

  users/
    index.vue                      → /users (name: 'users')
    [id].vue                       → /users/:id (name: 'users-id')
    [id]/
      edit.vue                     → /users/:id/edit (name: 'users-id-edit')

  blog/
    index.vue                      → /blog (name: 'blog')
    posts_[slug].vue               → /blog/posts/:slug (name: 'blog-posts-slug')

  dashboard/
    +layout.vue                    → Layout wrapper
    +index.vue                     → /dashboard (name: 'dashboard', has children)
    overview.vue                   → /dashboard/overview (name: 'dashboard-overview')
    settings.vue                   → /dashboard/settings (name: 'dashboard-settings')
    users/
      +layout.vue                  → Nested layout
      index.vue                    → /dashboard/users (name: 'dashboard-users')
      [id].vue                     → /dashboard/users/:id (name: 'dashboard-users-id')

  docs/
    [...slug].vue                  → /docs/:slug(.*)* (name: 'docs-slug-all')

  (admin)/
    settings.vue                   → /settings (name: 'settings')
    users.vue                      → /users (name: 'users')

  @global/
    help.vue                       → scope: 'global' (not 'popup')
```

## Advanced

### Layouts

> This feature is Vue-only for now

In larger applications its common to wrap pages in a [layout](https://nuxt.com/docs/4.x/directory-structure/app/layouts), for example a header and footer.

You can do this in your application's main `App` file, or within route folders with a `+layout.vue` file:

```vue
<!-- /pages/+layout.vue or /pages/admin/+layout.vue -->
<template>
  <header>...</header>
  <main>
    <slot />
  </main>
  <footer>...</footer>
</template>
```

Any routes within the same folder will be automatically wrapped in the sibling `+layout.vue` file, with the page component rendering within the layout's `<slot />`.

### Indexes

> This feature is Vue-only for now

Many routing frameworks have a concept of [nested routes](https://router.vuejs.org/guide/essentials/nested-routes), where downstream paths are rendered within a separate route outlet.

To do this, add a `+index.vue` file to the folder where you want downstream routes to render:

```vue
<!-- /pages/users/+index.vue -->
<template>
  <nav>
    <router-link to="/users/123">View</router-link>
    <router-link to="/users/123/edit">edit</router-link>
  </nav>
  <section>
    <router-view />
  </section>
</template>
```

Any routes downstream from `/users/*`  such as `/users/:id` or `/users/:id/edit` would be rendered into the `<router-view />` in the `+index.vue` file, with the surrounding page not updating as downstream routes are navigated to.

### Scopes

> These docs are currently incomplete! Currently all scopes are global

By default, routes are scoped based on their directory location:

- `src/pages/` → `global` scope
- `entrypoints/popup/pages/` → `popup` scope
- `entrypoints/options/pages/` → `options` scope

You can override the scope using the `@scope` prefix in your file path:

```yaml
entrypoints/popup/pages/
  @global/
    shared.vue               → Available as global scope, not popup
  @options/
    common.vue               → Available as options scope, not popup
```

This is useful when you want to organize files by entrypoint but export routes to different scopes.

#### Global vs Scoped Routes

**Global routes** (`src/pages/`) are shared across all entrypoints:

```ts
// Any entrypoint can use global routes
import routes from 'wxt-module-pages:routes/global'
```

**Scoped routes** are isolated to specific entrypoints:

```ts
// entrypoints/popup/main.ts
import routes from 'wxt-module-pages:routes/popup'

// entrypoints/options/main.ts
import routes from 'wxt-module-pages:routes/options'
```

**Combining scopes:**

```ts
import { global, popup } from 'wxt-module-pages:routes'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [...global, ...popup]
})
```

### Developer Experience

#### Hot Module Replacement (HMR)

The module watches your `pages/` directories and automatically rebuilds routes when you:

- Add new page files
- Remove page files
- Rename page files

Changes trigger a full page reload to ensure routes are up-to-date.

#### TypeScript Support

Type declarations are automatically generated during the build. Import routes with full type safety:

```ts
import routes from 'wxt-module-pages:routes/popup'
// routes is typed as RouteRecordRaw[] (for Vue)
```

#### Build Output

During development, you'll see helpful logs:

```markdown
[wxt-module-pages] Using Vue driver
[wxt-module-pages] Found 2 pages folders
[wxt-module-pages] Generated routes for 2 scopes
  - popup
    - /
    - /about
    - /users
    - /users/:id
```

## Drivers

### Overview

The module uses a **driver system** to support multiple frontend frameworks. Each driver knows how to:

1. Identify framework-specific files (`.vue`, `.jsx`, `.tsx`, etc.)
2. Generate route code in the framework's format
3. Handle layouts and nested routes appropriately

Drivers are small, focused modules that transform generic route definitions into framework-specific code.

### Example Setup

All frameworks follow the same pattern:

1. Configure the driver in `wxt.config.ts`
2. Import routes from the virtual module
3. Pass routes to your framework's router

See framework-specific examples below.

### Frameworks

#### Vue (Default)

```ts
// wxt.config.ts
import { defineConfig } from 'wxt'
import pages from 'wxt-module-pages'

export default defineConfig({
  modules: [pages()]  // Vue is default
})
```

```ts
// entrypoints/popup/main.ts
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import routes from 'wxt-module-pages:routes/popup'
import App from './App.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

createApp(App).use(router).mount('#app')
```

**Layout files:** `+layout.vue`
**Parent files:** `+index.vue`
**Extensions:** `.vue`

#### React

```ts
// wxt.config.ts
import pages, { reactDriver } from 'wxt-module-pages'

export default defineConfig({
  modules: [pages({ driver: reactDriver() })]
})
```

```ts
// entrypoints/popup/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import routes from 'wxt-module-pages:routes/popup'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        {routes.map(route => (
          <Route key={route.path} {...route} />
        ))}
      </Routes>
    </HashRouter>
  </StrictMode>
)
```

**Layout files:** `+layout.tsx`
**Parent files:** `+layout.tsx`
**Extensions:** `.jsx`, `.tsx`

#### Preact

```ts
// wxt.config.ts
import pages, { preactDriver } from 'wxt-module-pages'

export default defineConfig({
  modules: [pages({ driver: preactDriver() })]
})
```

```ts
// entrypoints/popup/main.tsx
import { render } from 'preact'
import { Router, Route } from 'preact-router'
import routes from 'wxt-module-pages:routes/popup'

render(
  <Router>
    {routes.map(route => (
      <Route key={route.path} path={route.path} component={route.component} />
    ))}
  </Router>,
  document.getElementById('root')!
)
```

**Layout files:** `+layout.tsx`
**Parent files:** `+index.tsx`
**Extensions:** `.jsx`, `.tsx`

#### Svelte

```ts
// wxt.config.ts
import pages, { svelteDriver } from 'wxt-module-pages'

export default defineConfig({
  modules: [pages({ driver: svelteDriver() })]
})
```

```ts
// entrypoints/popup/main.ts
import { mount } from 'svelte'
import Router from 'svelte-spa-router'
import routes from 'wxt-module-pages:routes/popup'
import App from './App.svelte'

// Convert to svelte-spa-router format
const routeMap = {}
routes.forEach(route => {
  routeMap[route.path] = route.component
})

mount(App, {
  target: document.getElementById('app')!,
  props: { routes: routeMap }
})
```

**Layout files:** `+layout.svelte`
**Parent files:** `+page.svelte`
**Extensions:** `.svelte`

#### Solid.js

```ts
// wxt.config.ts
import pages, { solidDriver } from 'wxt-module-pages'

export default defineConfig({
  modules: [pages({ driver: solidDriver() })]
})
```

```ts
// entrypoints/popup/main.tsx
import { render } from 'solid-js/web'
import { Router, Route } from '@solidjs/router'
import routes from 'wxt-module-pages:routes/popup'

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

**Layout files:** `+layout.tsx`
**Parent files:** `+index.tsx`
**Extensions:** `.jsx`, `.tsx`

#### Lit (Web Components)

```ts
// wxt.config.ts
import pages, { litDriver } from 'wxt-module-pages'

export default defineConfig({
  modules: [pages({ driver: litDriver() })]
})
```

```ts
// entrypoints/popup/main.ts
import { Router } from '@vaadin/router'
import routes from 'wxt-module-pages:routes/popup'

const outlet = document.getElementById('outlet')
const router = new Router(outlet)

// Load all components
Promise.all(routes.map(route => route.load())).then(() => {
  router.setRoutes(routes)
})
```

**Layout files:** `+layout.ts`
**Parent files:** `+index.ts`
**Extensions:** `.ts`, `.js`

#### Angular

```ts
// wxt.config.ts
import pages, { angularDriver } from 'wxt-module-pages'

export default defineConfig({
  modules: [pages({ driver: angularDriver() })]
})
```

```ts
// entrypoints/popup/main.ts
import { bootstrapApplication } from '@angular/platform-browser'
import { provideRouter } from '@angular/router'
import { AppComponent } from './app.component'
import routes from 'wxt-module-pages:routes/popup'

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)]
})
```

**Layout files:** `layout.component.ts`
**Parent files:** `index.component.ts`
**Extensions:** `.component.ts`

### Custom Drivers

Create your own driver for custom frameworks or routing configurations:

```ts
import type { PagesDriver } from 'wxt-module-pages'

function myCustomDriver(): PagesDriver {
  return {
    name: 'my-framework',
    extensions: ['.custom'],
    layoutFile: '+layout.custom',
    parentFile: '+index.custom',

    routeToCode(route, depth = 0) {
      const indent = '  '.repeat(depth + 1)
      const childIndent = '  '.repeat(depth + 2)

      let code = `${indent}{\n`
      code += `${childIndent}path: '${route.path}',\n`
      code += `${childIndent}name: '${route.name}',\n`
      code += `${childIndent}component: () => import('${route.file}')`

      if (route.children?.length) {
        code += `,\n${childIndent}children: [\n`
        code += route.children.map(child => this.routeToCode(child, depth + 2)).join(',\n')
        code += `\n${childIndent}]`
      }

      code += `\n${indent}}`
      return code
    },

    routesToCode(routeStrings) {
      return `export default [\n${routeStrings.join(',\n')}\n]`
    },

    declarationsToCode(scope) {
      return `
  const routes: Route[]
  export default routes
`
    }
  }
}

export default defineConfig({
  modules: [pages({ driver: myCustomDriver() })]
})
```

**Driver interface:**

```ts
interface PagesDriver {
  name: string                              // Display name
  extensions: string[]                      // File extensions to scan
  layoutFile?: string                       // Layout file name
  parentFile?: string                       // Parent route file name
  routeToCode(route, depth?): string        // Convert route to code
  routesToCode(routeStrings): string        // Wrap routes in export
  declarationsToCode(scope): string         // TypeScript declarations
}
```

## License

MIT © [Dave Stewart](https://github.com/davestewart)
