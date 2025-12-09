import { RouteDefinition } from '../router/routes'

export interface PagesDriver {
  /**
   * Driver name (e.g., 'vue', 'react', 'svelte')
   */
  name: string,

  /**
   * File extensions to scan for (e.g., ['.vue', '.jsx', '.svelte'])
   */
  extensions: string[]

  /**
   * Layout file name (e.g., '+layout.vue', 'layout.tsx') – wraps component
   */
  layoutFile?: string

  /**
   * Parent file name (e.g., '+index.vue', 'page.tsx') – generates children routes
   */
  parentFile?: string

  /**
   * Convert a route definition to code string
   */
  routeToCode (route: RouteDefinition, depth?: number): string

  /**
   * Wrap all routes in framework-specific export
   */
  routesToCode (routeStrings: string[]): string

  /**
   * Type declarations for import scopes
   */
  declarationsToCode (name: string): string
}

// ---------------------------------------------------------------------------------------------------------------------
// full support
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Vue driver for WXT Pages
 *
 * @see https://router.vuejs.org
 */
export function vueDriver (): PagesDriver {
  return {
    name: 'Vue',
    extensions: ['.vue'],
    layoutFile: '+layout.vue',
    parentFile: '+index.vue',

    routeToCode (route, depth = 0) {
      const indent = '  '.repeat(depth + 1)
      const childIndent = '  '.repeat(depth + 2)

      let code = `${indent}{\n`
      code += `${childIndent}path: '${route.path}',\n`
      code += `${childIndent}name: '${route.name}',\n`
      code += route.layout
        ? `${childIndent}component: withLayout('${route.file}', '${route.layout}')`
        : `${childIndent}component: () => import('${route.file}')`

      if (route.children && route.children.length > 0) {
        code += `,\n${childIndent}children: [\n`
        code += route.children.map(child => this.routeToCode(child, depth + 2)).join(',\n')
        code += `\n${childIndent}]`
      }

      code += `\n${indent}}`
      return code
    },

    routesToCode (routeStrings) {
      return `import { h } from 'vue'

function withLayout(componentPath, layoutPath) {
  return async () => {
    const [{ default: Layout }, { default: Component }] = await Promise.all([
      import(/* @vite-ignore */ layoutPath),
      import(/* @vite-ignore */ componentPath)
    ])

    return {
      render() {
        return h(Layout, null, {
          default: () => h(Component)
        })
      }
    }
  }
}

export default [
${routeStrings.join(',\n')}
]`
    },

    declarationsToCode() {
      return `
  import type { RouteRecordRaw } from 'vue-router'
  const routes: RouteRecordRaw[]
  export default routes
`
    }
  }
}

/**
 * React driver for WXT Pages
 *
 * @see https://reactrouter.com
 */
export function reactDriver (): PagesDriver {
  return {
    name: 'React',
    extensions: ['.jsx', '.tsx'],
    layoutFile: '+layout.tsx',
    parentFile: '+layout.tsx',

    routeToCode (route, depth = 0) {
      const indent = '  '.repeat(depth + 1)
      const childIndent = '  '.repeat(depth + 2)

      let code = `${indent}{\n`
      code += `${childIndent}path: '${route.path}',\n`
      code += `${childIndent}Component: lazy(() => import('${route.file}'))`

      if (route.children && route.children.length > 0) {
        code += `,\n${childIndent}children: [\n`
        code += route.children.map(child => this.routeToCode(child, depth + 2)).join(',\n')
        code += `\n${childIndent}]`
      }

      code += `\n${indent}}`
      return code
    },

    routesToCode (routeStrings) {
      return `import { lazy } from 'react'

export default [
${routeStrings.join(',\n')}
]`
    },

    declarationsToCode() {
      return `
  import type { RouteObject } from 'react-router-dom'
  const routes: RouteObject[]
  export default routes
`
    }

  }
}

/**
 * Preact driver for WXT Pages
 *
 * @see https://preactjs.com/guide/v10/preact-iso/#router
 */
export function preactDriver (): PagesDriver {
  return {
    name: 'Preact',
    extensions: ['.jsx', '.tsx'],
    layoutFile: '+layout.tsx',
    parentFile: '+index.tsx',

    routeToCode (route, depth = 0) {
      const indent = '  '.repeat(depth + 1)
      const childIndent = '  '.repeat(depth + 2)

      let code = `${indent}{\n`
      code += `${childIndent}path: '${route.path}',\n`
      code += `${childIndent}component: lazy(() => import('${route.file}'))`

      if (route.children && route.children.length > 0) {
        code += `,\n${childIndent}children: [\n`
        code += route.children.map(child => this.routeToCode(child, depth + 2)).join(',\n')
        code += `\n${childIndent}]`
      }

      code += `\n${indent}}`
      return code
    },

    routesToCode (routeStrings) {
      return `import { lazy } from 'preact/compat'

export default [
${routeStrings.join(',\n')}
]`
    },

    declarationsToCode() {
      return `
  import { Route } from 'preact-iso'
  const routes: Route[]
  export default routes
`
    }
  }
}

export function angularDriver (): PagesDriver {
  return {
    name: 'Angular',
    extensions: ['.component.ts'],
    layoutFile: 'layout.component.ts',
    parentFile: 'index.component.ts',

    routeToCode (route, depth = 0) {
      const indent = '  '.repeat(depth + 1)
      const childIndent = '  '.repeat(depth + 2)

      let code = `${indent}{\n`
      code += `${childIndent}path: '${route.path}',\n`
      code += `${childIndent}loadComponent: () => import('${route.file}').then(m => m.${pascalCase(route.name)}Component)`

      if (route.children && route.children.length > 0) {
        code += `,\n${childIndent}children: [\n`
        code += route.children.map(child => this.routeToCode(child, depth + 2)).join(',\n')
        code += `\n${childIndent}]`
      }

      code += `\n${indent}}`
      return code
    },

    routesToCode (routeStrings) {
      return `import { Routes } from '@angular/router'

export const routes: Routes = [
${routeStrings.join(',\n')}
]`
    },

    declarationsToCode() {
      return `
  import type { Routes } from '@angular/router'
  export const routes: Routes
`
    }
  }
}

export function solidDriver (): PagesDriver {
  return {
    name: 'Solid',
    extensions: ['.jsx', '.tsx'],
    layoutFile: '+layout.tsx',
    parentFile: '+index.tsx',

    routeToCode (route, depth = 0) {
      const indent = '  '.repeat(depth + 1)
      const childIndent = '  '.repeat(depth + 2)

      let code = `${indent}{\n`
      code += `${childIndent}path: '${route.path}',\n`
      code += `${childIndent}component: lazy(() => import('${route.file}'))`

      if (route.children && route.children.length > 0) {
        code += `,\n${childIndent}children: [\n`
        code += route.children.map(child => this.routeToCode(child, depth + 2)).join(',\n')
        code += `\n${childIndent}]`
      }

      code += `\n${indent}}`
      return code
    },

    routesToCode (routeStrings) {
      return `import { lazy } from 'solid-js'

export default [
${routeStrings.join(',\n')}
]`
    },

    declarationsToCode() {
      return `
  import type { RouteDefinition } from '@solidjs/router'
  const routes: RouteDefinition[]
  export default routes`
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// partial support
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Lit driver for WXT Pages
 *
 * @see https://lit.dev/docs/libraries/labs/
 * @see https://github.com/lit/lit/tree/main/packages/labs/router
 */
export function litDriver (): PagesDriver {
  return {
    name: 'Lit',
    extensions: ['.ts', '.js'],
    layoutFile: '+layout.ts',
    parentFile: '+index.ts',

    routeToCode (route, depth = 0) {
      const indent = '  '.repeat(depth + 1)
      const childIndent = '  '.repeat(depth + 2)
      const componentName = route.name.replace(/-/g, '_')

      let code = `${indent}{\n`
      code += `${childIndent}path: '${route.path}',\n`
      code += `${childIndent}component: '${componentName}',\n`
      code += `${childIndent}load: () => import('${route.file}')`

      if (route.children && route.children.length > 0) {
        code += `,\n${childIndent}children: [\n`
        code += route.children.map(child => this.routeToCode(child, depth + 2)).join(',\n')
        code += `\n${childIndent}]`
      }

      code += `\n${indent}}`
      return code
    },

    routesToCode (routeStrings) {
      return `export default [
${routeStrings.join(',\n')}
]`
    },

    declarationsToCode() {
      return `// not implemented yet`
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// possibly unsupported
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Svelte driver for WXT Pages
 *
 * Note: Svelte routing is typically file-based using the SvelteKit framework
 *
 * @see https://kit.svelte.dev/docs/routing
 */
export function svelteDriver (): PagesDriver {
  return {
    name: 'Svelte',
    extensions: ['.svelte'],
    layoutFile: '+layout.svelte',
    parentFile: '+page.svelte',

    routeToCode (route, depth = 0) {
      const indent = '  '.repeat(depth + 1)
      const childIndent = '  '.repeat(depth + 2)

      let code = `${indent}{\n`
      code += `${childIndent}path: '${route.path}',\n`
      code += `${childIndent}component: () => import('${route.file}')`

      if (route.children && route.children.length > 0) {
        code += `,\n${childIndent}children: [\n`
        code += route.children.map(child => this.routeToCode(child, depth + 2)).join(',\n')
        code += `\n${childIndent}]`
      }

      code += `\n${indent}}`
      return code
    },

    routesToCode (routeStrings) {
      return `export default [
${routeStrings.join(',\n')}
]`
    },

    declarationsToCode() {
      return `// not supported yet`
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// utils
// ---------------------------------------------------------------------------------------------------------------------

export function pascalCase (str: string) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}
