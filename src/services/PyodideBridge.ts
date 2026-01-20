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
      // eslint-disable-next-line no-console
      console.log('Initializing Pyodide...')
      pyodideInstance = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
      })

      // eslint-disable-next-line no-console
      console.log('Loading Python packages...')
      await pyodideInstance.loadPackage(['numpy'])

      // eslint-disable-next-line no-console
      console.log('Mounting Python files...')
      await this.mountPythonFiles()

      // eslint-disable-next-line no-console
      console.log('Python backend initialized successfully')
      this.pyodideReady = true
    } catch (error) {
      console.error('Failed to initialize Pyodide:', error)
      throw new Error(`Pyodide initialization failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Mount Python source files from public/python/ into the virtual filesystem
   * Dynamically fetches and loads Python modules for production use
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

    // Create basic directory structure
    ;['src', 'src/core', 'src/core/modules', 'src/core/processors', 'src/core/kinetics', 'src/core/data'].forEach(
      ensureDir
    )

    // Try to load Python files from public/python/ directory
    try {
      await this.loadPythonFilesFromPublic(fs)
    } catch (e) {
      console.warn('Failed to load Python files from public directory, creating placeholders:', e)
      // Fallback to placeholder modules if public/python/ is not available
      this.createPlaceholderModules(fs)
    }

    // Initialize Python path and verify files
    await pyodideInstance.runPythonAsync(`
      import sys
      import os

      sys.path.insert(0, '/')
      print('Python path configured:', sys.path[:3], '...')

      # Verify critical files exist
      critical_files = [
          '/src/__init__.py',
          '/src/constants.py',
          '/src/core/__init__.py',
          '/src/core/processors/__init__.py',
          '/src/core/processors/calculation_processor.py',
      ]

      missing = []
      for f in critical_files:
          if not os.path.exists(f):
              missing.append(f)

      if missing:
          print('❌ CRITICAL: Missing files in VFS:', missing)
          raise RuntimeError(f'Missing {len(missing)} critical files in VFS')
      else:
          print('✓ All critical files verified in VFS')

      # Quick test import
      try:
          import src
          print(f'✓ src module: {src}')
          import src.core
          print(f'✓ src.core module: {src.core}')
          import src.core.processors
          print(f'✓ src.core.processors module: {src.core.processors}')
      except Exception as e:
          print(f'❌ Import test failed: {e}')
          import traceback
          traceback.print_exc()
          raise
    `)
  }

  /**
   * Dynamically load Python files from public/python/ directory
   * Fetches all .py files and writes them to virtual filesystem
   * Fails loudly if critical files are missing
   */
  private async loadPythonFilesFromPublic(fs: any): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('Loading Python files from public/python/...')

    // Determine base path - handle both dev and production
    const base = import.meta.env.BASE_URL || '/'
    const pythonBasePath = `${base}python/`.replace(/\/+/g, '/')
    // eslint-disable-next-line no-console
    console.log(`Base path: ${base}, Python files path: ${pythonBasePath}`)

    // List of ALL Python files to load - comprehensive list for all imports to work
    // Excludes test files to reduce load time
    const pythonModules = [
      // Root level
      'src/__init__.py',
      'src/constants.py',
      'src/conftest.py',
      'src/model_evaluator.py',

      // App modules
      'src/app/__init__.py',
      'src/app/calculator.py',
      'src/app/optimizer.py',
      'src/app/reporter.py',

      // Core package
      'src/core/__init__.py',

      // Core data
      'src/core/data/__init__.py',
      'src/core/data/materials_database.py',
      'src/core/data/extended_materials_database.py',

      // Core kinetics
      'src/core/kinetics/__init__.py',
      'src/core/kinetics/viscosity_conversion.py',
      'src/core/kinetics/reaction_kinetics.py',
      'src/core/kinetics/thermal_reaction.py',
      'src/core/kinetics/foam_kinetics.py',

      // Core machines
      'src/core/machines/__init__.py',
      'src/core/machines/machine_definitions.py',

      // Core ML
      'src/core/ml/__init__.py',
      'src/core/ml/nn_surrogate.py',
      'src/core/ml/ml_ensemble.py',

      // Core modules
      'src/core/modules/__init__.py',
      'src/core/modules/pressure.py',
      'src/core/modules/flow.py',
      'src/core/modules/thermal.py',
      'src/core/modules/environmental.py',

      // Core optimizers
      'src/core/optimizers/__init__.py',
      'src/core/optimizers/pressure_optimizer.py',
      'src/core/optimizers/inverse_optimization.py',

      // Core processors
      'src/core/processors/__init__.py',
      'src/core/processors/calculation_processor.py',

      // Core rheology
      'src/core/rheology/__init__.py',
      'src/core/rheology/advanced_fluid_models.py',

      // Core thermodynamics
      'src/core/thermodynamics/__init__.py',
      'src/core/thermodynamics/advanced_heat_transfer.py',
      'src/core/thermodynamics/thermal_integration.py',

      // Core validation
      'src/core/validation/__init__.py',
      'src/core/validation/user_input_workflow.py',

      // Other packages
      'src/data/__init__.py',
      'src/services/__init__.py',
      'src/test/__init__.py',
      'src/utils/__init__.py',
    ]

    const missingFiles: string[] = []
    const loadedFiles: string[] = []

    // Fetch and load each module
    const fetchErrors: Array<{file: string, url: string, error: string}> = []

    for (const modulePath of pythonModules) {
      try {
        const fetchUrl = `${pythonBasePath}${modulePath}`
        const response = await fetch(fetchUrl)
        if (!response.ok) {
          const errorMsg = `HTTP ${response.status} ${response.statusText}`
          fetchErrors.push({file: modulePath, url: fetchUrl, error: errorMsg})
          throw new Error(errorMsg)
        }
        const content = await response.text()

        // Ensure directory exists in Virtual FS (create all parent dirs)
        const dirPath = modulePath.substring(0, modulePath.lastIndexOf('/'))
        if (dirPath) {
          const parts = dirPath.split('/')
          let currentPath = ''
          for (const part of parts) {
            currentPath += '/' + part  // Always add leading slash
            if (!fs.analyzePath(currentPath).exists) {
              try {
                fs.mkdir(currentPath)
              } catch (e) {
                // Directory might already exist
              }
            }
          }
        }

        // Write file to virtual filesystem at root
        const vfsPath = `/${modulePath}`
        fs.writeFile(vfsPath, content)
        loadedFiles.push(modulePath)
      } catch (e) {
        const errorDetail = e instanceof Error ? e.message : String(e)
        if (!fetchErrors.find(err => err.file === modulePath)) {
          fetchErrors.push({
            file: modulePath,
            url: `${pythonBasePath}${modulePath}`,
            error: errorDetail
          })
        }
        missingFiles.push(modulePath)
      }
    }

    // Report detailed fetch errors
    if (fetchErrors.length > 0 && fetchErrors.length <= 5) {
      // eslint-disable-next-line no-console
      console.error('Fetch errors:', fetchErrors)
    } else if (fetchErrors.length > 0) {
      // eslint-disable-next-line no-console
      console.error(`First 3 fetch errors (${fetchErrors.length} total):`, fetchErrors.slice(0, 3))
    }

    // Report results
    // eslint-disable-next-line no-console
    console.log(`✓ Loaded ${loadedFiles.length}/${pythonModules.length} Python modules`)
    if (loadedFiles.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Sample loaded files:', loadedFiles.slice(0, 3).join(', '), '...')
    }

    if (missingFiles.length > 0) {
      const errorMsg = `Failed to load ${missingFiles.length} critical Python modules:\n${missingFiles.join('\n')}`
      // eslint-disable-next-line no-console
      console.error('❌ MISSING FILES:', errorMsg)
      throw new Error(errorMsg)
    }

    if (loadedFiles.length === 0) {
      throw new Error('No Python files were loaded! Check that files exist at: ' + pythonBasePath)
    }

    // eslint-disable-next-line no-console
    console.log('✓ All Python files loaded successfully')
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
      // Convert JavaScript objects to Python-compatible format
      const pythonArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          // Convert JS object to Python dict via JSON
          return pyodideInstance.toPy(arg)
        }
        return arg
      })

      // Set up arguments in Python
      const argName = `_args_${Date.now()}`
      pyodideInstance.globals.set(argName, pythonArgs)

      // Execute Python code
      const pythonCode = `
import json
import traceback
import sys
import importlib

_result = None
try:
    # Import the module dynamically using importlib
    module_path, func_name = '${functionPath}'.rsplit('.', 1)

    # Use importlib for proper module imports
    mod = importlib.import_module(module_path)

    # Get the function
    func = getattr(mod, func_name)

    # Call it with arguments
    args = ${argName}
    result = func(*args)

    # Convert result to JSON-compatible format
    if hasattr(result, '__dict__'):
        result = result.__dict__

    _result = result
except ImportError as e:
    # Return error info if imports fail
    print(f"[PYODIDE ERROR] ImportError: {e}", file=sys.stderr)
    traceback.print_exc()
    _result = {
        'success': False,
        'errors': [f"ImportError: {str(e)}"],
        'data': None
    }
except Exception as e:
    # Return error info for any other exception
    print(f"[PYODIDE ERROR] {type(e).__name__}: {e}", file=sys.stderr)
    traceback.print_exc()
    _result = {
        'success': False,
        'errors': [f"{type(e).__name__}: {str(e)}"],
        'data': None
    }

_result
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
