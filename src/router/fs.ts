import { join } from 'path'
import { glob } from 'glob'
import { readdir, stat } from 'fs/promises'

export interface PagesDirInfo {
  scope: string
  path: string
}

export async function getPagesDirs (sourcePath: string): Promise<PagesDirInfo[]> {
  // output
  const infos: PagesDirInfo[] = []

  // paths
  const pages = join(sourcePath, 'pages')
  const entrypoints = await glob(join(sourcePath, 'entrypoints/*/pages'), { absolute: true })
  const folders = [
    pages,
    ...entrypoints
  ]

  // test for pages folders
  for (const path of folders) {
    const isDir = await stat(path).then(stat => stat.isDirectory()).catch(() => false)
    if (isDir) {
      let scope = 'global'
      const matches = path.match(/\/entrypoints\/([^/]+)\/pages$/)
      if (matches) {
        scope = matches[1]
      }
      infos.push({ scope, path })
    }
  }

  // return
  return infos
}

export async function getPageFiles (dir: string, extensions: string[], files: string[] = []) {
  try {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const path = join(dir, entry.name)

      if (entry.isDirectory()) {
        await getPageFiles(path, extensions, files)
      }
      else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(path)
      }
    }
  }
  catch {
    // directory doesn't exist or can't be read
  }

  return files
}
