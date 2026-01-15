#!/usr/bin/env python3
"""
Test script to verify all imports work correctly
"""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'public', 'python'))

print("Testing imports...")
print(f"Python path: {sys.path}")

# Test 1: Import constants
try:
    from src.constants import PHYSICS, VALIDATION_RANGES, MATERIAL_PRESETS, MACHINE_SPECS
    print("✓ Constants import successful")
    print(f"  - PHYSICS type: {type(PHYSICS)}")
    print(f"  - MATERIAL_PRESETS keys: {list(MATERIAL_PRESETS.keys())}")
    print(f"  - MACHINE_SPECS keys: {list(MACHINE_SPECS.keys())}")
except Exception as e:
    print(f"✗ Constants import failed: {e}")
    import traceback
    traceback.print_exc()

# Test 2: Import validation
try:
    from src.core.validation import validate_parameters
    print("✓ Validation import successful")
    print(f"  - validate_parameters type: {type(validate_parameters)}")
except Exception as e:
    print(f"✗ Validation import failed: {e}")
    import traceback
    traceback.print_exc()

# Test 3: Import core modules
try:
    from src.core.modules import pressure, thermal, flow, environmental
    print("✓ Core modules import successful")
    print(f"  - pressure.calculate_pressure_drop: {hasattr(pressure, 'calculate_pressure_drop')}")
    print(f"  - thermal.calculate_thermal_effects: {hasattr(thermal, 'calculate_thermal_effects')}")
    print(f"  - flow.calculate_shear_rate: {hasattr(flow, 'calculate_shear_rate')}")
    print(f"  - environmental.calculate_environmental_impact: {hasattr(environmental, 'calculate_environmental_impact')}")
except Exception as e:
    print(f"✗ Core modules import failed: {e}")
    import traceback
    traceback.print_exc()

# Test 4: Import calculation_processor
try:
    from src.core.processors.calculation_processor import calculate_all
    print("✓ calculation_processor import successful")
    print(f"  - calculate_all type: {type(calculate_all)}")
except Exception as e:
    print(f"✗ calculation_processor import failed: {e}")
    import traceback
    traceback.print_exc()

# Test 5: Try a sample calculation
print("\n\nTesting sample calculation...")
try:
    from src.core.processors.calculation_processor import calculate_all

    test_params = {
        'pipe_length_mm': 500,
        'pipe_diameter_mm': 10,
        'material_key': 'ecofoam_standard',
        'temperature_c': 25,
        'flow_rate_lpm': 5,
        'machine_type': 'low_pressure'
    }

    print(f"Test parameters: {test_params}")
    result = calculate_all(test_params)
    print(f"✓ Calculation successful!")
    print(f"  - Success: {result.get('success')}")
    print(f"  - Errors: {result.get('errors', [])}")
    print(f"  - Warnings: {result.get('warnings', [])}")
    if result.get('data'):
        print(f"  - Data keys: {list(result['data'].keys())}")
except Exception as e:
    print(f"✗ Calculation failed: {e}")
    import traceback
    traceback.print_exc()

print("\n✓ All tests completed!")
