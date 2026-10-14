import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * The browser loads Python from a hand-kept list in PyodideBridge.ts. A module missing from it
 * fails only at runtime, in the browser, as an import error; a module deleted from disk but
 * left in the list is fetched on every boot and 404s. Both have happened, so the list is
 * checked against the source tree here.
 */

const ROOT = join(__dirname, '..', '..')

function pythonSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__pycache__' ? [] : pythonSources(path)
    const isModule = entry.name.endsWith('.py') && !entry.name.startsWith('test_')
    return isModule ? [relative(ROOT, path).split('\\').join('/')] : []
  })
}

function listedModules(): string[] {
  const source = readFileSync(join(ROOT, 'src', 'services', 'PyodideBridge.ts'), 'utf-8')
  const start = source.indexOf('const pythonModules = [')
  const end = source.indexOf(']', start)
  return [...source.slice(start, end).matchAll(/'(src\/[^']+\.py)'/g)].map((m) => m[1])
}

describe('Pyodide module list', () => {
  it('names every Python module in the source tree, and nothing else', () => {
    expect([...listedModules()].sort()).toEqual(pythonSources(join(ROOT, 'src')).sort())
  })
})
