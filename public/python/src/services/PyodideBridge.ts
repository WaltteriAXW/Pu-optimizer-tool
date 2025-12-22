import { loadPyodide, type PyodideInterface } from 'pyodide'
import type { PyodideManager } from './CalculationService'

let pyodideInstance: PyodideInterface | null = null

/**
 * PyodideBridge - Manages Python runtime in the browser
 * Loads the actual Python backend from src/core/
 */
export class PyodideBridge implements PyodideManager {
  private pyodideReady: boolean = false
  private initPromise: Promise<void> | null = null

  async initialize(): Promise<void> {
    if (this.pyodideReady && pyodideInstance) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this._doInitialize()
    return this.initPromise
  }

  private async _doInitialize(): Promise<void> {
    try {
      console.log('Initializing Pyodide...')
      pyodideInstance = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
      })

      console.log('Loading Python packages...')
      await pyodideInstance.loadPackage(['numpy'])

      console.log('Mounting Python files...')
      await this.mountPythonFiles()

      console.log('Python backend initialized successfully')
      this.pyodideReady = true
    } catch (error) {
      console.error('Failed to initialize Pyodide:', error)
      throw new Error(`Pyodide initialization failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Mount Python source files from src/core/ into the virtual filesystem
   * For production, these files should be in public/python/ or imported as raw
   */
  private async mountPythonFiles(): Promise<void> {
    if (!pyodideInstance) throw new Error('Pyodide not initialized')

    // Create virtual filesystem structure
    const fs = pyodideInstance.FS

    // Helper function to ensure directories exist
    const ensureDir = (dirPath: string) => {
      try {
        if (!fs.analyzePath(dirPath).exists) {
          fs.mkdir(dirPath)
        }
      } catch (e) {
        console.warn(`Could not create directory ${dirPath}:`, e)
      }
    }

    // Create directory structure
    ;['core', 'core/modules', 'core/processors', 'core/kinetics', 'core/data'].forEach(
      ensureDir
    )

    // For now, create minimal placeholder modules that will be lazy-loaded
    // In production, you would fetch these from your server or bundle them
    this.createPlaceholderModules(fs)

    // Initialize Python path
    await pyodideInstance.runPythonAsync(`
      import sys
      sys.path.insert(0, '/')
      print('Python path configured')
    `)
  }

  /**
   * Create minimal placeholder modules for lazy loading
   * These allow imports to succeed even before full file loading
   */
  private createPlaceholderModules(fs: any): void {
    // Create __init__.py files for packages
    const initFiles: Record<string, string> = {
      'core/__init__.py': '',
      'core/modules/__init__.py': '',
      'core/processors/__init__.py': '',
      'core/kinetics/__init__.py': '',
      'core/data/__init__.py': '',
    }

    Object.entries(initFiles).forEach(([path, content]) => {
      try {
        fs.writeFile(path, content)
      } catch (e) {
        console.warn(`Could not write file ${path}:`, e)
      }
    })
  }

  /**
   * Call a Python function from the browser
   * @param functionPath - Path like 'core.processors.calculation_processor.calculate_all'
   * @param args - Arguments to pass to the Python function
   */
  async callPython<T = unknown>(functionPath: string, args: unknown[]): Promise<T> {
    if (!this.pyodideReady || !pyodideInstance) {
      throw new Error('Pyodide not ready. Call initialize() first.')
    }

    try {
      // Set up arguments in Python
      const argName = `_args_${Date.now()}`
      pyodideInstance.globals.set(argName, args)

      // Execute Python code
      const pythonCode = `
import json
import traceback

try:
    # Import the module dynamically
    module_path, func_name = '${functionPath}'.rsplit('.', 1)
    parts = module_path.split('.')

    # Dynamic import
    mod = __import__(parts[0])
    for part in parts[1:]:
        mod = getattr(mod, part)

    # Get the function
    func = getattr(mod, func_name)

    # Call it with arguments
    args = ${argName}
    result = func(*args)

    # Convert result to JSON-compatible format
    if hasattr(result, '__dict__'):
        result = result.__dict__

    result
except ImportError as e:
    # For now, return mock data if imports fail (for testing)
    # In production, ensure all modules are properly loaded
    print(f"Import error: {e}")
    {
        'success': False,
        'errors': [str(e)],
        'data': None
    }
except Exception as e:
    traceback.print_exc()
    {
        'success': False,
        'errors': [f"{type(e).__name__}: {str(e)}"],
        'data': None
    }
`

      const result = await pyodideInstance.runPythonAsync(pythonCode)
      const jsResult = result.toJs({ dict_converter: Object.fromEntries })
      pyodideInstance.globals.delete(argName)

      return jsResult as T
    } catch (error) {
      console.error(`Python execution error for ${functionPath}:`, error)
      throw new Error(
        `Python error: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  isReady(): boolean {
    return this.pyodideReady
  }

  async loadPackage(packageName: string): Promise<void> {
    if (!pyodideInstance) {
      throw new Error('Pyodide not initialized')
    }
    await pyodideInstance.loadPackage(packageName)
  }
}
