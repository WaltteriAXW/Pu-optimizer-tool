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
      print('Python path configured:', sys.path)

      # List files in VFS to verify they loaded
      if os.path.exists('/src'):
          print('VFS /src directory contents:')
          for root, dirs, files in os.walk('/src'):
              level = root.replace('/src', '').count('/')
              indent = ' ' * 2 * level
              print(f'{indent}{os.path.basename(root)}/')
              subindent = ' ' * 2 * (level + 1)
              for file in files:
                  print(f'{subindent}{file}')
      else:
          print('WARNING: /src directory not found in VFS!')
    `)
  }

  /**
   * Dynamically load Python files from public/python/ directory
   * Fetches all .py files and writes them to virtual filesystem
   * Fails loudly if critical files are missing
   */
  private async loadPythonFilesFromPublic(fs: any): Promise<void> {
    console.log('Loading Python files from public/python/...')

    // Determine base path - handle both dev and production
    const base = import.meta.env.BASE_URL || '/'
    const pythonBasePath = `${base}python/`.replace(/\/+/g, '/')
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
    for (const modulePath of pythonModules) {
      try {
        const fetchUrl = `${pythonBasePath}${modulePath}`
        const response = await fetch(fetchUrl)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const content = await response.text()

        // Ensure directory exists in Virtual FS (create all parent dirs)
        const dirPath = modulePath.substring(0, modulePath.lastIndexOf('/'))
        if (dirPath) {
          const parts = dirPath.split('/')
          let currentPath = ''
          for (const part of parts) {
            currentPath += (currentPath ? '/' : '') + part
            if (currentPath && !fs.analyzePath(currentPath).exists) {
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
        console.error(`❌ FAILED to load: ${modulePath}`, e)
        missingFiles.push(modulePath)
      }
    }

    // Report results
    console.log(`✓ Loaded ${loadedFiles.length}/${pythonModules.length} Python modules`)
    if (loadedFiles.length > 0) {
      console.log('Loaded files:', loadedFiles.slice(0, 5).join(', '), loadedFiles.length > 5 ? `... and ${loadedFiles.length - 5} more` : '')
    }

    if (missingFiles.length > 0) {
      const errorMsg = `Failed to load ${missingFiles.length} critical Python modules:\n${missingFiles.join('\n')}\n\nMake sure Python files are synced to public/python/`
      console.error(errorMsg)
      throw new Error(errorMsg)
    }

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
      // Set up arguments in Python
      const argName = `_args_${Date.now()}`
      pyodideInstance.globals.set(argName, args)

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
