import { relative } from 'node:path'
import chokidar from 'chokidar'
import pc from 'picocolors'
import 'wxt'
import { defineWxtModule } from 'wxt/modules'
import { makeLogger, plural, type LogLevel } from '@davestewart/wxt-utils'
import { filesToRoutes, type RouteDefinition, routesToCode } from './router/routes'
import { getPageFiles, getPagesDirs, PagesDirInfo } from './router/fs'
import { type PagesDriver, vueDriver } from './drivers'

export interface PagesModuleOptions {
  /** Driver to use (defaults to vue) */
  driver?: PagesDriver

  /** Log route creation in dev mode (defaults to true) */
  logLevel?: LogLevel

  /** Enable file watching in dev mode (defaults to true) */
  watch?: boolean
}

declare module 'wxt' {
  interface InlineConfig {
    pages?: PagesModuleOptions;
  }
}

export const module = defineWxtModule<PagesModuleOptions>({
  name: 'wxt-module-pages',

  configKey: 'pages',

  async setup (wxt, options = {}) {
    // -----------------------------------------------------------------------------------------------------------------
    // setup
    // -----------------------------------------------------------------------------------------------------------------

    // options
    const driver = options.driver || vueDriver()
    const watch = options.watch !== false // default to true
    const srcDir = wxt.config.srcDir

    // logging
    const Logger = makeLogger(wxt.logger, 'pages', options.logLevel)

    // all source folders (main and layers)
    const sourceDirs = [
      srcDir
      // layers added on 'layers:resolved' hook
    ]

    // all <src>/pages and <src>/entrypoints/*/pages directories with their scopes
    const pagesInfos: PagesDirInfo[] = [
      // src and layers built on 'ready' hook
    ]

    // a map of scope -> routes, built on 'ready' hook
    const routesByScope: Map<string, RouteDefinition[]> = new Map()

    // -----------------------------------------------------------------------------------------------------------------
    // routes
    // -----------------------------------------------------------------------------------------------------------------

    // build routes function (we'll call this multiple times)
    async function buildRoutes () {
      // const routesByScope = new Map<string, RouteDefinition[]>()
      routesByScope.clear()

      // always add global routes!
      routesByScope.set('global', [])

      // add all routes
      for (const { path: dir, scope: dirScope } of pagesInfos) {
        const files = await getPageFiles(dir, driver.extensions)
        const routes = filesToRoutes(files, dir, dirScope, driver.parentFile, driver.layoutFile)

        // log
        // log('Found routes:', routes)

        for (const route of routes) {
          const routeScope = route.scope

          if (!routesByScope.has(routeScope)) {
            routesByScope.set(routeScope, [])
          }

          const existingRoutes = routesByScope.get(routeScope)!
          const existingIndex = existingRoutes.findIndex(r => r.path === route.path)
          if (existingIndex >= 0) {
            existingRoutes[existingIndex] = route
          }
          else {
            existingRoutes.push(route)
          }
        }
      }
      return routesByScope
    }

    function flattenRoutes (routes: RouteDefinition[], prefix = ''): string[] {
      return routes.flatMap(route => {
        const currentPath = route.path
        const result = [currentPath]
        if (route.children?.length) {
          return [
            // ...result,
            ...flattenRoutes(route.children, currentPath + '/')
          ]
        }
        return result
      }).sort()
    }

    function logRoutes () {
      // log
      Logger.info(`Found ${plural('page folder', pagesInfos.length)}`)

      // scopes
      for (const { path, scope } of pagesInfos) {
        const rel = relative(srcDir, path)
        const scopeLabel = scope === 'global'
          ? pc.dim('(global)')
          : pc.cyan(`@${scope}`)
        Logger.debug(` - ${rel} ${scopeLabel}`)
      }

      const scopes = Array.from(routesByScope.keys())
      Logger.success(`Generated routes for ${plural('scope', routesByScope.size)}`)
      for (const scope of scopes) {
        Logger.debug(`- ${scope}`)
        const routes = routesByScope.get(scope)!
        const flatRoutes = flattenRoutes(routes)
        for (const route of flatRoutes) {
          Logger.debug(`   - ${route}`)
        }
      }
    }

    /**
     * Update routes by rescanning all sources, grabbing pages folders, then rebuilding routes
     */
    async function updateRoutes (log = false) {
      // get all pages from all sources
      for (const sourceDir of sourceDirs) {
        const dirs = await getPagesDirs(sourceDir)
        pagesInfos.push(...dirs)
      }

      // build routes
      await buildRoutes()

      // log
      if (log) {
        logRoutes()
      }
    }

    /**
     * When layers are resolved, we add their source directories to the list of sourceDirs
     *
     * @see https://github.com/davestewart/wxt-module-layers
     */
    wxt.hook('layers:resolved' as any, async (layerDirs: string[]) => {
      sourceDirs.push(...layerDirs)
    })

    /**
     * On the 'ready' hook, we perform the initial route generation by calling updateRoutes.
     * This ensures that all layers have been resolved before we scan for pages directories.
     */
    wxt.hook('ready', async () => {
      await updateRoutes()
      logRoutes()
    })

    // begin
    Logger.debug(`Using ${pc.green(driver.name)} driver`)

    // -----------------------------------------------------------------------------------------------------------------
    // vite plugin
    // -----------------------------------------------------------------------------------------------------------------

    // variables
    const MODULE_NAME = 'wxt-module-pages:routes'
    const MODULE_ID = '\0' + MODULE_NAME

    wxt.hook('prepare:types', async (_, entries) => {
      // individual routes
      const scopes = Array.from(routesByScope.keys())
      const routes = Array.from(scopes).map((scope) => {
        const code = driver.declarationsToCode(scope)
        const path = `${MODULE_NAME}/${scope}`
        return `declare module '${path}' {${code}}`
      }).join('\n\n')

      // index route
      const code = scopes.map(scope => {
        return `    ${scope}: import('${MODULE_NAME}/${scope}').default`
      }).join(',\n')
      const index = `declare module '${MODULE_NAME}' {
  export default {
${code}
  }
}`

      // index route
      const text = `// Generated by wxt-module-pages\n\n${routes}\n\n${index}\n`

      // add
      entries.push({
        tsReference: true,
        path: 'wxt-module-pages.d.ts',
        text,
      })
    })

    // simple router for virtual module paths
    function parseRoute (path: string): { path: string } | null {
      const [id, ...segments] = path.split('/')
      if (id === MODULE_ID) {
        return { path: segments.join('/') }
      }
      return null
    }

    // create virtual module plugin
    function createVitePlugin () {
      return {
        name: 'wxt-module-pages',

        resolveId (id: string) {
          if (id === MODULE_NAME) {
            return MODULE_ID
          }
          else if (id.startsWith(MODULE_NAME + '/')) {
            return '\0' + id
          }
        },
        async load (id: string) {
          const route = parseRoute(id)
          if (route) {
            const path = route.path

            // index file (imports all routes then exports as a single object)
            if (path === '') {
              let output = ''
              const scopes = Array.from(routesByScope.keys())
              for (const scope of scopes) {
                output += `import ${scope} from '${MODULE_NAME}/${scope}'\n`
              }
              output += `export default { ${scopes.join(', ') } }\n`
              return output
            }

            // scope (individual routes directly from the driver)
            else {
              const routes = routesByScope.get(path) || []
              if (routes.length === 0) {
                Logger.warn(`Invalid routes import: ${path}`)
              }
              return routesToCode(routes, driver)
            }
          }
        },

        async handleHotUpdate ({ file, server }: { file: string; server: any }) {
          const isPageFile = pagesInfos.some(({ path }) => file.startsWith(path))

          if (isPageFile) {
            // invalidate all virtual modules
            const modules = [
              server.moduleGraph.getModuleById(MODULE_ID),
              ...Array.from(routesByScope.keys())
                .map(scope => server.moduleGraph.getModuleById(`${MODULE_ID}/${scope}`))
            ].filter(Boolean)

            modules.forEach((module: any) => {
              if (module) server.moduleGraph.invalidateModule(module)
            })

            // when do we need to rebuild routes here?
            // server.ws.send({ type: 'full-reload' })
          }
        }
      }
    }

    // register dev server plugin with optional file watching
    if (wxt.config.command === 'serve') {
      if (!watch) {
        Logger.info('File watching disabled')
      }

      wxt.hook('vite:devServer:extendConfig', (config: any) => {
        config.plugins = config.plugins || []

        // add watcher plugin if watch is enabled
        if (watch) {
          // store watcher instance
          let watcher: any = null

          config.plugins.push({
            name: 'wxt-module-pages-watcher-helper',
            configureServer (server: any) {
              Logger.debug('Vite server ready, starting file watcher...')

              const watchPaths = pagesInfos.map(({ path }) => path)

              const watcher = chokidar.watch(watchPaths, {
                ignoreInitial: true,
                ignored: /(^|[\/\\])\../, // ignore dotfiles
                persistent: true,
                awaitWriteFinish: {
                  stabilityThreshold: 100,
                  pollInterval: 100
                }
              })

              watcher.on('ready', () => {
                Logger.debug('File watcher active and listening')
              })

              watcher.on('all', async (event: string, filePath: string) => {
                // filter for relevant file extensions
                const isRelevantFile = driver.extensions.some(ext => filePath.endsWith(ext))

                if (!isRelevantFile) {
                  return
                }

                Logger.debug(`File event: ${event} - ${relative(srcDir, filePath)}`)

                if (event === 'add' || event === 'unlink' || event === 'addDir' || event === 'unlinkDir') {
                  Logger.debug(`Processing ${event}...`)
                  Logger.debug('Regenerating routes...')

                  // rebuild routes
                  await updateRoutes()

                  Logger.debug(`Updated routes for ${routesByScope.size} scope(s)`)

                  // invalidate virtual modules
                  const virtualModules = [
                    server.moduleGraph.getModuleById(MODULE_ID),
                    ...Array.from(routesByScope.keys())
                      .map(scope => server.moduleGraph.getModuleById(`${MODULE_ID}/${scope}`))
                  ].filter(Boolean)

                  virtualModules.forEach((module: any) => {
                    if (module) {
                      server.moduleGraph.invalidateModule(module, new Set(), Date.now(), true)
                    }
                  })

                  // trigger full reload
                  server.ws.send({
                    type: 'full-reload',
                    path: '*'
                  })
                }
              })

              watcher.on('error', (error: Error) => {
                Logger.error(`Watcher error: ${error}`)
              })

              // cleanup when server closes
              server.httpServer?.on('close', () => {
                Logger.debug('Closing file watcher')
                watcher.close()
              })
            },

            // cleanup when plugin is destroyed
            buildEnd () {
              if (watcher) {
                watcher.close()
                watcher = null
              }
            }
          })

          Logger.debug(`Watching folders`)
        }

        // add main plugin
        config.plugins.push(createVitePlugin())
      })
    }

    // register plugin for build
    wxt.hook('vite:build:extendConfig', (_entrypoints: any, config: any) => {
      config.plugins = config.plugins || []
      config.plugins.push(createVitePlugin())
    })
  }
})

