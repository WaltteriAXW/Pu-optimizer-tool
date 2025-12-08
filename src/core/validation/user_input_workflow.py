"""
Complete User Input Workflow with Error Handling

Handles:
1. Missing inputs
2. Invalid inputs
3. Unknown materials (custom products)
4. Custom product creation and saving
5. Error messaging and recovery
"""

from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from enum import Enum


class InputErrorType(Enum):
    """Types of input errors"""
    MISSING_REQUIRED = "missing_required"
    INVALID_TYPE = "invalid_type"
    OUT_OF_RANGE = "out_of_range"
    MATERIAL_NOT_FOUND = "material_not_found"
    MATERIAL_INCOMPLETE = "material_incomplete"
    CONFLICTING_PARAMETERS = "conflicting_parameters"
    PHYSICS_VIOLATION = "physics_violation"


@dataclass
class InputError:
    """Represents a validation error"""
    error_type: InputErrorType
    field: str
    message: str
    suggestion: str
    severity: str  # "error" (blocking) or "warning" (non-blocking)
    user_value: Any = None


@dataclass
class InputValidationResult:
    """Result of input validation"""
    is_valid: bool
    errors: List[InputError]
    warnings: List[InputError]
    required_inputs: Dict[str, bool]  # Which required inputs are present
    messages_for_user: List[str]


class UserInputValidator:
    """
    Validates user input with helpful error messages
    """

    REQUIRED_INPUTS = [
        'pipe_length_mm',
        'pipe_diameter_mm',
        'material_key',
        'temperature_c',
        'flow_rate_lpm',
    ]

    OPTIONAL_INPUTS = [
        'machine_type',  # 'high_pressure' or 'low_pressure'
        'pressure_override',  # For testing specific pressures
    ]

    def validate_user_input(
        self,
        user_input: Dict[str, Any],
        allow_custom_material: bool = True
    ) -> InputValidationResult:
        """
        Comprehensive validation of user input

        Args:
            user_input: User-provided parameters
            allow_custom_material: Allow materials not in database?

        Returns:
            InputValidationResult with errors and suggestions
        """
        errors = []
        warnings = []
        required_present = {field: False for field in self.REQUIRED_INPUTS}

        # Check for completely missing input
        if not user_input or not isinstance(user_input, dict):
            return InputValidationResult(
                is_valid=False,
                errors=[
                    InputError(
                        error_type=InputErrorType.MISSING_REQUIRED,
                        field="all",
                        message="No input provided or input is not a dictionary",
                        suggestion="Please provide a dictionary with keys: " + ", ".join(self.REQUIRED_INPUTS),
                        severity="error"
                    )
                ],
                warnings=[],
                required_inputs=required_present,
                messages_for_user=["❌ No input data provided"]
            )

        # Validate each required input
        for field in self.REQUIRED_INPUTS:
            if field in user_input:
                required_present[field] = True
                result = self._validate_field(field, user_input[field], allow_custom_material)
                errors.extend(result['errors'])
                warnings.extend(result['warnings'])
            else:
                errors.append(
                    InputError(
                        error_type=InputErrorType.MISSING_REQUIRED,
                        field=field,
                        message=f"Required field '{field}' is missing",
                        suggestion=self._get_field_suggestion(field),
                        severity="error"
                    )
                )

        # Check optional inputs if provided
        for field in self.OPTIONAL_INPUTS:
            if field in user_input:
                result = self._validate_field(field, user_input[field], allow_custom_material)
                errors.extend(result['errors'])
                warnings.extend(result['warnings'])

        # Cross-parameter validation (requires multiple inputs)
        if all(required_present.values()):
            cross_validation = self._cross_validate_parameters(user_input)
            errors.extend(cross_validation['errors'])
            warnings.extend(cross_validation['warnings'])

        # Generate user-friendly messages
        messages = self._generate_user_messages(errors, warnings, required_present)

        return InputValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            required_inputs=required_present,
            messages_for_user=messages
        )

    def _validate_field(
        self,
        field: str,
        value: Any,
        allow_custom_material: bool
    ) -> Dict[str, List[InputError]]:
        """Validate individual field"""
        errors = []
        warnings = []

        # Pipe length validation
        if field == 'pipe_length_mm':
            if not isinstance(value, (int, float)):
                errors.append(InputError(
                    error_type=InputErrorType.INVALID_TYPE,
                    field=field,
                    message=f"Expected number, got {type(value).__name__}",
                    suggestion="Provide pipe length as a number, e.g., 1000",
                    severity="error",
                    user_value=value
                ))
            elif value <= 0:
                errors.append(InputError(
                    error_type=InputErrorType.OUT_OF_RANGE,
                    field=field,
                    message=f"Pipe length must be positive, got {value}",
                    suggestion="Provide length > 0 mm, e.g., 1000 mm for 1 meter",
                    severity="error",
                    user_value=value
                ))
            elif value > 10000:
                warnings.append(InputError(
                    error_type=InputErrorType.OUT_OF_RANGE,
                    field=field,
                    message=f"Pipe length {value} mm is unusually long (>10 meters)",
                    suggestion="Confirm this is correct. Very long pipes may have extreme pressure drops.",
                    severity="warning",
                    user_value=value
                ))

        # Pipe diameter validation
        elif field == 'pipe_diameter_mm':
            if not isinstance(value, (int, float)):
                errors.append(InputError(
                    error_type=InputErrorType.INVALID_TYPE,
                    field=field,
                    message=f"Expected number, got {type(value).__name__}",
                    suggestion="Provide pipe diameter as a number, e.g., 20",
                    severity="error",
                    user_value=value
                ))
            elif value <= 0:
                errors.append(InputError(
                    error_type=InputErrorType.OUT_OF_RANGE,
                    field=field,
                    message=f"Pipe diameter must be positive, got {value}",
                    suggestion="Provide diameter > 0 mm, e.g., 20 mm",
                    severity="error",
                    user_value=value
                ))
            elif value < 1:
                warnings.append(InputError(
                    error_type=InputErrorType.OUT_OF_RANGE,
                    field=field,
                    message=f"Pipe diameter {value} mm is very small",
                    suggestion="Very small pipes (<1 mm) may be difficult to work with.",
                    severity="warning",
                    user_value=value
                ))

        # Temperature validation
        elif field == 'temperature_c':
            if not isinstance(value, (int, float)):
                errors.append(InputError(
                    error_type=InputErrorType.INVALID_TYPE,
                    field=field,
                    message=f"Expected number, got {type(value).__name__}",
                    suggestion="Provide temperature as a number, e.g., 25",
                    severity="error",
                    user_value=value
                ))
            elif value < -50:
                errors.append(InputError(
                    error_type=InputErrorType.OUT_OF_RANGE,
                    field=field,
                    message=f"Temperature {value}°C is below freezing point of polyurethane components",
                    suggestion="Use temperature >= -50°C for polyurethane systems",
                    severity="error",
                    user_value=value
                ))
            elif value > 100:
                warnings.append(InputError(
                    error_type=InputErrorType.OUT_OF_RANGE,
                    field=field,
                    message=f"Temperature {value}°C is very high for polyurethane processing",
                    suggestion="Typical processing: 15-50°C. Confirm this is correct.",
                    severity="warning",
                    user_value=value
                ))

        # Flow rate validation
        elif field == 'flow_rate_lpm':
            if not isinstance(value, (int, float)):
                errors.append(InputError(
                    error_type=InputErrorType.INVALID_TYPE,
                    field=field,
                    message=f"Expected number, got {type(value).__name__}",
                    suggestion="Provide flow rate as a number, e.g., 10",
                    severity="error",
                    user_value=value
                ))
            elif value <= 0:
                errors.append(InputError(
                    error_type=InputErrorType.OUT_OF_RANGE,
                    field=field,
                    message=f"Flow rate must be positive, got {value}",
                    suggestion="Provide flow rate > 0 LPM, e.g., 10 LPM",
                    severity="error",
                    user_value=value
                ))
            elif value < 0.1:
                warnings.append(InputError(
                    error_type=InputErrorType.OUT_OF_RANGE,
                    field=field,
                    message=f"Flow rate {value} LPM is very low (<0.1 LPM)",
                    suggestion="Very low flow rates may cause material separation.",
                    severity="warning",
                    user_value=value
                ))

        # Material key validation
        elif field == 'material_key':
            if not isinstance(value, str):
                errors.append(InputError(
                    error_type=InputErrorType.INVALID_TYPE,
                    field=field,
                    message=f"Expected text, got {type(value).__name__}",
                    suggestion="Provide material as text, e.g., 'ecofoam_xhd_rc'",
                    severity="error",
                    user_value=value
                ))
            elif not value or value.strip() == "":
                errors.append(InputError(
                    error_type=InputErrorType.MISSING_REQUIRED,
                    field=field,
                    message="Material key cannot be empty",
                    suggestion="Select a material from the database or create a custom material",
                    severity="error"
                ))
            else:
                # Check if material exists in database
                from src.core.data.materials_database import MaterialDatabase
                material = MaterialDatabase.get_material(value)
                if material is None:
                    if allow_custom_material:
                        warnings.append(InputError(
                            error_type=InputErrorType.MATERIAL_NOT_FOUND,
                            field=field,
                            message=f"Material '{value}' not found in database",
                            suggestion=f"This will be treated as a CUSTOM material. You'll need to provide all specifications. Available materials: genfoam_hd12, genfoam_hd20, ecomate_spray, ecofoam_xhd_rc",
                            severity="warning",
                            user_value=value
                        ))
                    else:
                        errors.append(InputError(
                            error_type=InputErrorType.MATERIAL_NOT_FOUND,
                            field=field,
                            message=f"Material '{value}' not found in database",
                            suggestion="Available materials: genfoam_hd12, genfoam_hd20, ecomate_spray, ecofoam_xhd_rc. Or enable custom materials.",
                            severity="error",
                            user_value=value
                        ))

        return {'errors': errors, 'warnings': warnings}

    def _cross_validate_parameters(self, user_input: Dict[str, Any]) -> Dict[str, List[InputError]]:
        """Validate relationships between parameters"""
        errors = []
        warnings = []

        try:
            length_m = user_input['pipe_length_mm'] / 1000
            diameter_m = user_input['pipe_diameter_mm'] / 1000
            flow_m3_s = user_input['flow_rate_lpm'] / 60 / 1000

            # Check for extreme length/diameter ratio
            if length_m / diameter_m > 500:
                warnings.append(InputError(
                    error_type=InputErrorType.PHYSICS_VIOLATION,
                    field="pipe_length_mm / pipe_diameter_mm",
                    message=f"Length/diameter ratio is {length_m/diameter_m:.0f} (very high)",
                    suggestion="Very long thin pipes have extreme pressure drops. Confirm this is intentional.",
                    severity="warning"
                ))

            # Check for extreme flow velocity
            radius_m = diameter_m / 2
            velocity = flow_m3_s / (3.14159 * radius_m * radius_m)
            if velocity > 10:
                warnings.append(InputError(
                    error_type=InputErrorType.PHYSICS_VIOLATION,
                    field="flow_rate_lpm / pipe_diameter_mm",
                    message=f"Flow velocity is {velocity:.1f} m/s (very high, >10 m/s)",
                    suggestion="High velocity causes large pressure drops and heating. Consider larger diameter pipe.",
                    severity="warning"
                ))
            elif velocity < 0.01:
                warnings.append(InputError(
                    error_type=InputErrorType.PHYSICS_VIOLATION,
                    field="flow_rate_lpm / pipe_diameter_mm",
                    message=f"Flow velocity is {velocity:.4f} m/s (very low, <0.01 m/s)",
                    suggestion="Very low velocity may cause material separation. Consider smaller diameter pipe.",
                    severity="warning"
                ))

        except (KeyError, ZeroDivisionError, TypeError):
            pass  # Already caught in field validation

        return {'errors': errors, 'warnings': warnings}

    def _get_field_suggestion(self, field: str) -> str:
        """Get helpful suggestion for missing field"""
        suggestions = {
            'pipe_length_mm': "How long is your pipe/line in millimeters? E.g., 1000 for 1 meter",
            'pipe_diameter_mm': "What is the inner diameter of your pipe in millimeters? E.g., 20",
            'material_key': "Which material? Options: genfoam_hd12, genfoam_hd20, ecomate_spray, ecofoam_xhd_rc",
            'temperature_c': "At what temperature? E.g., 25 for room temperature",
            'flow_rate_lpm': "What flow rate in Liters Per Minute? E.g., 10",
        }
        return suggestions.get(field, f"Please provide {field}")

    def _generate_user_messages(
        self,
        errors: List[InputError],
        warnings: List[InputError],
        required_present: Dict[str, bool]
    ) -> List[str]:
        """Generate user-friendly error messages"""
        messages = []

        # Missing inputs
        missing = [f for f, present in required_present.items() if not present]
        if missing:
            messages.append(f"❌ Missing required inputs: {', '.join(missing)}")

        # Errors
        if errors:
            messages.append(f"\n⚠️  ERRORS (calculation cannot proceed):")
            for error in errors:
                messages.append(f"  • {error.field}: {error.message}")
                messages.append(f"    💡 {error.suggestion}")

        # Warnings
        if warnings:
            messages.append(f"\n⚠️  WARNINGS (calculation will proceed, but check these):")
            for warning in warnings:
                messages.append(f"  • {warning.field}: {warning.message}")
                messages.append(f"    💡 {warning.suggestion}")

        if not errors and not missing:
            messages.append("✅ All inputs valid - ready to calculate")

        return messages


# ============================================================================
# CUSTOM PRODUCT SUPPORT
# ============================================================================

@dataclass
class CustomProductSpec:
    """Specification for a custom polyurethane product"""
    product_name: str
    product_key: str  # Unique identifier (e.g., 'custom_acme_foam_v1')

    # Component properties
    polyol_viscosity_cps: float
    isocyanate_viscosity_cps: float
    polyol_density_kg_m3: float
    isocyanate_density_kg_m3: float

    # Reaction characteristics
    cream_time_s: float
    gel_time_s: float
    free_rise_density_kg_m3: float

    # Rheological properties
    flow_index: float  # 0.7-0.9 typical
    consistency_coefficient_pa_s: float
    yield_stress_pa: Optional[float] = None
    activation_energy_j_mol: float = 25000

    # Environmental
    gwp_kg_co2_eq: float = 0
    odp: float = 0
    is_eco_friendly: bool = False

    # Optional properties
    notes: str = ""
    created_at: str = ""
    created_by: str = ""


class CustomProductManager:
    """
    Manages user-created custom polyurethane products
    """

    def __init__(self, storage_backend=None):
        """
        Initialize with optional storage backend

        Args:
            storage_backend: For saving/loading custom products
                           Can be: file, database, cloud, etc.
        """
        self.storage = storage_backend
        self.custom_products: Dict[str, CustomProductSpec] = {}

    def validate_custom_product(
        self,
        spec: CustomProductSpec
    ) -> Tuple[bool, List[str]]:
        """
        Validate custom product specification

        Returns:
            (is_valid, error_messages)
        """
        errors = []

        # Validate viscosities
        if spec.polyol_viscosity_cps <= 0:
            errors.append(f"Polyol viscosity must be positive, got {spec.polyol_viscosity_cps}")
        if spec.isocyanate_viscosity_cps <= 0:
            errors.append(f"Isocyanate viscosity must be positive, got {spec.isocyanate_viscosity_cps}")

        # Validate densities
        if spec.polyol_density_kg_m3 <= 0 or spec.polyol_density_kg_m3 > 2000:
            errors.append(f"Polyol density unrealistic: {spec.polyol_density_kg_m3} kg/m³")
        if spec.isocyanate_density_kg_m3 <= 0 or spec.isocyanate_density_kg_m3 > 2000:
            errors.append(f"Isocyanate density unrealistic: {spec.isocyanate_density_kg_m3} kg/m³")

        # Validate reaction times
        if spec.cream_time_s <= 0:
            errors.append(f"Cream time must be positive")
        if spec.gel_time_s <= spec.cream_time_s:
            errors.append(f"Gel time must be > cream time ({spec.gel_time_s} vs {spec.cream_time_s})")

        # Validate flow index
        if not (0 < spec.flow_index < 1):
            errors.append(f"Flow index must be between 0 and 1, got {spec.flow_index}")

        # Validate consistency coefficient
        if spec.consistency_coefficient_pa_s <= 0:
            errors.append(f"Consistency coefficient must be positive")

        # Validate activation energy
        if not (10000 <= spec.activation_energy_j_mol <= 50000):
            errors.append(f"Activation energy {spec.activation_energy_j_mol} J/mol outside typical range (10k-50k)")

        return len(errors) == 0, errors

    def create_custom_product(self, spec: CustomProductSpec) -> Tuple[bool, str]:
        """
        Create and register a custom product

        Args:
            spec: CustomProductSpec with all specifications

        Returns:
            (success, message)
        """
        is_valid, errors = self.validate_custom_product(spec)

        if not is_valid:
            return False, f"Invalid product specification:\n" + "\n".join(errors)

        # Check for duplicate key
        if spec.product_key in self.custom_products:
            return False, f"Product key '{spec.product_key}' already exists"

        # Store in memory
        self.custom_products[spec.product_key] = spec

        # Attempt to save to storage backend if available
        if self.storage:
            try:
                self.storage.save_product(spec)
            except Exception as e:
                return False, f"Created product but failed to save: {str(e)}"

        return True, f"✅ Custom product '{spec.product_name}' created successfully"

    def get_custom_product(self, product_key: str) -> Optional[CustomProductSpec]:
        """Get a custom product by key"""
        return self.custom_products.get(product_key)

    def list_custom_products(self) -> Dict[str, str]:
        """List all custom products"""
        return {
            key: spec.product_name
            for key, spec in self.custom_products.items()
        }

    def delete_custom_product(self, product_key: str) -> bool:
        """Delete a custom product"""
        if product_key in self.custom_products:
            del self.custom_products[product_key]
            if self.storage:
                self.storage.delete_product(product_key)
            return True
        return False


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

def example_workflow():
    """
    Complete example: User inputs with validation and custom product
    """

    # ===== SCENARIO 1: User provides incomplete input =====
    print("=" * 70)
    print("SCENARIO 1: User provides incomplete input")
    print("=" * 70)

    incomplete_input = {
        'pipe_length_mm': 1000,
        'pipe_diameter_mm': 20,
        # Missing: material_key, temperature_c, flow_rate_lpm
    }

    validator = UserInputValidator()
    result = validator.validate_user_input(incomplete_input)

    print("\nValidation Result:")
    print(f"Valid: {result.is_valid}")
    for msg in result.messages_for_user:
        print(msg)

    # ===== SCENARIO 2: User provides invalid input =====
    print("\n" + "=" * 70)
    print("SCENARIO 2: User provides invalid input")
    print("=" * 70)

    invalid_input = {
        'pipe_length_mm': -100,  # NEGATIVE!
        'pipe_diameter_mm': 0.5,  # WARNING: very small
        'material_key': 'ecofoam_xhd_rc',
        'temperature_c': 'hot',  # NOT A NUMBER!
        'flow_rate_lpm': 200,  # Very high
    }

    result = validator.validate_user_input(invalid_input)

    print("\nValidation Result:")
    print(f"Valid: {result.is_valid}")
    for msg in result.messages_for_user:
        print(msg)

    # ===== SCENARIO 3: Material not in database =====
    print("\n" + "=" * 70)
    print("SCENARIO 3: Unknown material (custom product)")
    print("=" * 70)

    custom_material_input = {
        'pipe_length_mm': 1000,
        'pipe_diameter_mm': 20,
        'material_key': 'acme_custom_foam_v2',  # NOT in database!
        'temperature_c': 25,
        'flow_rate_lpm': 10,
    }

    result = validator.validate_user_input(custom_material_input, allow_custom_material=True)

    print("\nValidation Result:")
    print(f"Valid: {result.is_valid}")
    for msg in result.messages_for_user:
        print(msg)

    if not result.is_valid:
        print("\n💡 User needs to either:")
        print("   1. Choose a material from the database")
        print("   2. Create a custom material specification")

    # ===== SCENARIO 4: Create and use custom product =====
    print("\n" + "=" * 70)
    print("SCENARIO 4: User creates custom product")
    print("=" * 70)

    custom_mgr = CustomProductManager()

    # User provides custom specs
    custom_spec = CustomProductSpec(
        product_name="Acme Custom Foam v2",
        product_key="acme_custom_foam_v2",
        polyol_viscosity_cps=650,
        isocyanate_viscosity_cps=220,
        polyol_density_kg_m3=1100,
        isocyanate_density_kg_m3=1230,
        cream_time_s=12,
        gel_time_s=45,
        free_rise_density_kg_m3=50,
        flow_index=0.80,
        consistency_coefficient_pa_s=0.65,
        yield_stress_pa=3.0,
        activation_energy_j_mol=26000,
        gwp_kg_co2_eq=2000,  # Older blowing agent
        notes="Custom formulation for special application"
    )

    # Validate custom spec
    success, message = custom_mgr.create_custom_product(custom_spec)
    print(f"\nCustom Product Creation: {message}")

    if success:
        print("\nNow user can use this custom product:")
        print(f"  'material_key': '{custom_spec.product_key}'")

        # Validate input with custom product
        custom_input = {
            'pipe_length_mm': 1000,
            'pipe_diameter_mm': 20,
            'material_key': 'acme_custom_foam_v2',  # NOW it works!
            'temperature_c': 25,
            'flow_rate_lpm': 10,
        }

        result = validator.validate_user_input(custom_input)
        print("\nValidation with custom product:")
        for msg in result.messages_for_user:
            print(msg)

    # ===== SCENARIO 5: Valid input =====
    print("\n" + "=" * 70)
    print("SCENARIO 5: Valid, complete input")
    print("=" * 70)

    valid_input = {
        'pipe_length_mm': 1000,
        'pipe_diameter_mm': 20,
        'material_key': 'ecofoam_xhd_rc',
        'temperature_c': 40,
        'flow_rate_lpm': 10,
    }

    result = validator.validate_user_input(valid_input)

    print("\nValidation Result:")
    print(f"Valid: {result.is_valid}")
    for msg in result.messages_for_user:
        print(msg)

    if result.is_valid:
        print("\n✅ Ready to proceed with calculation!")
        print("   Next step: Run PressureOptimizer with this input")


if __name__ == '__main__':
    example_workflow()
