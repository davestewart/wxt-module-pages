import { basename, dirname, relative } from 'node:path'
import type { PagesDriver } from '../drivers'

export interface RouteDefinition {
  path: string
  name: string
  file: string
  scope: string
  children?: RouteDefinition[]
  layout?: string
}

export interface FileNode {
  absPath: string
  relPath: string
  isLayout: boolean
  isParent: boolean
  scope: string
}

export function filesToRoutes (
  files: string[],
  baseDir: string,
  dirScope: string,
  parentFileName?: string,
  layoutFileName?: string,
): RouteDefinition[] {
  // separate layouts and pages, detect @scope, detect flat routes
  const nodes: FileNode[] = files.map(absPath => {
    const relPath = relative(baseDir, absPath).replace(/\\/g, '/')

    // special files
    const isParent = !!(parentFileName && basename(absPath) === parentFileName)
    const isLayout = !!(layoutFileName && basename(absPath) === layoutFileName)

    // check for @scope prefix in path
    const fileScopeMatch = relPath.match(/^@([^/]+)\//)
    const scope = fileScopeMatch
      ? fileScopeMatch[1]
      : dirScope

    return { absPath, relPath, isParent, isLayout, scope }
  })

  // build tree structure
  return buildRouteTree(nodes, baseDir)
}

function buildRouteTree (nodes: FileNode[], baseDir: string): RouteDefinition[] {
  // hash of directories for this baseDir
  const byDirectory = new Map<string, FileNode[]>()

  // loop over all nodes, grouping by directory
  for (const node of nodes) {
    const dir = dirname(node.relPath)
    if (!byDirectory.has(dir)) {
      byDirectory.set(dir, [])
    }
    byDirectory.get(dir)!.push(node)
  }

  function processDirectory (dir: string, parentPath: string = '', parentScope?: string): RouteDefinition[] {
    // get all input files in this directory
    const filesInDir = byDirectory.get(dir) || []

    // special files
    const parent = filesInDir.find(f => f.isParent)
    const layout = filesInDir.find(f => f.isLayout)
    const pages = filesInDir.filter(f => !f.isLayout && !f.isParent)

    // all valid routes in this directory
    const dirRoutes: RouteDefinition[] = []

    for (const page of pages) {
      const route = fileToRoute(page, baseDir, parentPath, false, parentScope)

      // if we have a layout in this directory, assign it to the route
      if (layout) {
        route.layout = layout.absPath
      }

      // check if this page has child directories
      const pageName = basename(page.relPath).replace(/\.(vue|jsx|tsx|svelte|component\.ts)$/, '')
      const childDir = dir === '.' ? pageName : `${dir}/${pageName}`

      // this page has children, make it a parent
      if (byDirectory.has(childDir)) {
        route.children = processDirectory(childDir, route.path, route.scope)
      }

      // if route is "flat" route, convert path spaces to slashes
      if (route.path.includes('_')) {
        route.path = route.path.replace(/_/g,  '/')
        route.name = route.path.replace(/^\//, '').replace(/\/:?/g,  '-')
      }

      dirRoutes.push(route)
    }

    // Process orphan subdirectories (directories without a parent file)
    const processedDirs = new Set(
      pages.map(p => {
        const pageName = basename(p.relPath).replace(/\.(vue|jsx|tsx|svelte|component\.ts)$/, '')
        return dir === '.' ? pageName : `${dir}/${pageName}`
      })
    )

    for (const [subDir] of byDirectory) {
      if (subDir !== dir && dirname(subDir) === dir && !processedDirs.has(subDir)) {
        const orphanRoutes = processDirectory(subDir, '', parentScope)
        dirRoutes.push(...orphanRoutes)
      }
    }

    // if there's a parent (router view) wrap all routes in it
    if (parent) {
      const parentRoute = fileToRoute(parent, baseDir, parentPath, true, parentScope)
      parentRoute.children = dirRoutes
      return [parentRoute]
    }

    return dirRoutes
  }

  return processDirectory('.')
}

function fileToRoute (
  node: FileNode,
  baseDir: string,
  parentPath: string = '',
  isParent: boolean = false,
  parentScope?: string
): RouteDefinition {
  // strip extension
  let relativePath = node.relPath
    .replace(/\.(vue|jsx|tsx|svelte|component\.ts)$/, '')

  // determine scope - use parent scope if nested, otherwise use file's scope
  const scope = parentScope || node.scope

  // strip @namespace prefix from path
  relativePath = relativePath.replace(/^@[^/]+\//, '')

  // get the file name without the directory
  const fileName = basename(relativePath)

  // handle route groups: (admin)/users -> users
  const cleanRelativePath = relativePath.replace(/\([^)]+\)\//g, '')

  // handle parent routes
  if (isParent) {
    const dir = dirname(cleanRelativePath)
    const path = dir === '.' ? '' : dir
    const name = path.replace(/\//g, '-') || 'parent'

    return {
      path: parentPath ? '' : '/' + path,
      name,
      file: node.absPath,
      scope,
      children: []
    }
  }

  // handle index routes
  let path: string
  if (fileName === 'index') {
    path = dirname(cleanRelativePath)
    path = path === '.' ? '/' : '/' + path
  }
  else {
    path = '/' + cleanRelativePath
  }

  // handle dynamic routes: [id] -> :id
  path = path.replace(/\[(\w+)\]/g, ':$1')

  // handle catch-all routes: [...slug] -> :slug(.*)
  path = path.replace(/\[\.\.\.(\w+)\]/g, ':$1(.*)*')

  // remove parent path if nested
  if (parentPath && path.startsWith(parentPath)) {
    path = path.slice(parentPath.length)
    // Remove leading slash for nested routes (children should be relative)
    if (path.startsWith('/') && path !== '/') {
      path = path.slice(1)
    }
    // If path is empty after stripping, it's an index route
    if (!path) {
      path = ''
    }
  }

  // convert to route name: about/team.vue -> about-team
  const name = cleanRelativePath
    .replace(/\[\.\.\.(\w+)\]/g, '$1-all')
    .replace(/\[(\w+)\]/g, '$1')
    .replace(/\//g, '-')
    .replace(/^index$/, 'index')
    .replace(/-index$/, '')

  return {
    path,
    name,
    file: node.absPath,
    scope
  }
}

export function routesToCode (routes: RouteDefinition[], driver: PagesDriver) {
  function processRoute (route: RouteDefinition, depth: number = 0): string {
    return driver.routeToCode(route, depth)
  }

  const routeStrings = routes.map(route => processRoute(route, 0))
  return driver.routesToCode(routeStrings)
}
