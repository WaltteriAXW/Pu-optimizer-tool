"""
Phase 4 Tier 4: Custom Machine Definitions and Specifications.

Define different polyurethane injection molding machine types with:
- Pressure ranges (low pressure, high pressure)
- Flow rate capabilities
- Temperature control
- Custom machine creation
- Machine compatibility checking

Author: Phase 4 Tier 4
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum


class MachineType(Enum):
    """Types of polyurethane injection machines"""
    LOW_PRESSURE = "low_pressure"
    HIGH_PRESSURE = "high_pressure"
    ULTRA_HIGH_PRESSURE = "ultra_high_pressure"
    SPRAY_EQUIPMENT = "spray_equipment"
    POURING_MACHINE = "pouring_machine"
    CUSTOM = "custom"


@dataclass
class PressureSpecification:
    """Pressure capabilities of machine"""
    min_pressure_bar: float = 1.0
    max_pressure_bar: float = 10.0
    nominal_pressure_bar: float = 5.0
    pressure_controllable: bool = True


@dataclass
class FlowSpecification:
    """Flow rate capabilities of machine"""
    min_flow_rate_lpm: float = 0.1
    max_flow_rate_lpm: float = 100.0
    nominal_flow_rate_lpm: float = 10.0
    flow_rate_adjustable: bool = True
    pump_efficiency: float = 0.85  # Pump efficiency (0-1)


@dataclass
class TemperatureControl:
    """Temperature control capabilities"""
    min_controllable_temp_c: float = 15.0
    max_controllable_temp_c: float = 60.0
    heating_rate_c_per_min: float = 2.0
    cooling_rate_c_per_min: float = 1.0
    temp_stability_c: float = 0.5  # Temperature stability ±°C


@dataclass
class PolyurethaneMachine:
    """Complete polyurethane injection machine specification"""
    name: str
    machine_key: str
    machine_type: MachineType

    # Pressure capabilities
    pressure: PressureSpecification = field(default_factory=PressureSpecification)

    # Flow capabilities
    flow: FlowSpecification = field(default_factory=FlowSpecification)

    # Temperature control
    temperature: TemperatureControl = field(default_factory=TemperatureControl)

    # Machine characteristics
    year_manufactured: int = 2020
    manufacturer: str = "Unknown"
    model: str = "Unknown"

    # Operational characteristics
    warm_up_time_minutes: float = 30.0
    cycle_time_seconds: float = 60.0
    shot_volume_ml: Optional[float] = None

    # Quality and reliability
    pressure_accuracy_percent: float = 5.0  # ±% of set pressure
    flow_accuracy_percent: float = 3.0  # ±% of set flow
    repeatability_percent: float = 2.0  # Shot-to-shot repeatability

    # Cost parameters
    power_consumption_kw: float = 15.0
    operating_cost_eur_per_hour: float = 50.0

    # Notes and metadata
    notes: str = ""


class MachineDatabase:
    """Database of standard and custom polyurethane machines"""

    def __init__(self):
        """Initialize machine database"""
        self.machines: Dict[str, PolyurethaneMachine] = {}
        self.custom_machines: Dict[str, PolyurethaneMachine] = {}
        self._create_standard_machines()

    def _create_standard_machines(self):
        """Create standard machine definitions"""

        # 1. LOW PRESSURE MACHINES
        self.add_machine(PolyurethaneMachine(
            name="Low Pressure Standard",
            machine_key="low_pressure_standard",
            machine_type=MachineType.LOW_PRESSURE,
            pressure=PressureSpecification(
                min_pressure_bar=2.0,
                max_pressure_bar=20.0,
                nominal_pressure_bar=8.0,
            ),
            flow=FlowSpecification(
                min_flow_rate_lpm=0.5,
                max_flow_rate_lpm=50.0,
                nominal_flow_rate_lpm=10.0,
                pump_efficiency=0.82,
            ),
            temperature=TemperatureControl(
                min_controllable_temp_c=18,
                max_controllable_temp_c=55,
                heating_rate_c_per_min=1.5,
            ),
            manufacturer="Loewenstein",
            model="NB1",
            cycle_time_seconds=90,
            power_consumption_kw=12.0,
            notes="Standard low-pressure machine for flexible/semi-rigid foams",
        ))

        # 2. HIGH PRESSURE MACHINES
        self.add_machine(PolyurethaneMachine(
            name="High Pressure Standard",
            machine_key="high_pressure_standard",
            machine_type=MachineType.HIGH_PRESSURE,
            pressure=PressureSpecification(
                min_pressure_bar=80.0,
                max_pressure_bar=200.0,
                nominal_pressure_bar=150.0,
            ),
            flow=FlowSpecification(
                min_flow_rate_lpm=5.0,
                max_flow_rate_lpm=200.0,
                nominal_flow_rate_lpm=50.0,
                pump_efficiency=0.88,
            ),
            temperature=TemperatureControl(
                min_controllable_temp_c=20,
                max_controllable_temp_c=60,
                heating_rate_c_per_min=2.5,
            ),
            manufacturer="KraussMaffei",
            model="Termomix",
            cycle_time_seconds=60,
            power_consumption_kw=25.0,
            notes="Standard high-pressure RIM/RRIM machine for rigid foams",
        ))

        # 3. ULTRA-HIGH PRESSURE
        self.add_machine(PolyurethaneMachine(
            name="Ultra-High Pressure Advanced",
            machine_key="ultra_high_pressure_advanced",
            machine_type=MachineType.ULTRA_HIGH_PRESSURE,
            pressure=PressureSpecification(
                min_pressure_bar=150.0,
                max_pressure_bar=350.0,
                nominal_pressure_bar=250.0,
            ),
            flow=FlowSpecification(
                min_flow_rate_lpm=10.0,
                max_flow_rate_lpm=300.0,
                nominal_flow_rate_lpm=80.0,
                pump_efficiency=0.90,
            ),
            temperature=TemperatureControl(
                min_controllable_temp_c=22,
                max_controllable_temp_c=65,
                heating_rate_c_per_min=3.0,
                cooling_rate_c_per_min=1.5,
            ),
            manufacturer="Cannon Group",
            model="MJ2000",
            cycle_time_seconds=45,
            power_consumption_kw=35.0,
            notes="Ultra-high pressure for precision RIM applications",
        ))

        # 4. SPRAY EQUIPMENT
        self.add_machine(PolyurethaneMachine(
            name="Spray Equipment Mobile",
            machine_key="spray_equipment_mobile",
            machine_type=MachineType.SPRAY_EQUIPMENT,
            pressure=PressureSpecification(
                min_pressure_bar=15.0,
                max_pressure_bar=50.0,
                nominal_pressure_bar=30.0,
            ),
            flow=FlowSpecification(
                min_flow_rate_lpm=5.0,
                max_flow_rate_lpm=100.0,
                nominal_flow_rate_lpm=25.0,
                pump_efficiency=0.80,
            ),
            temperature=TemperatureControl(
                min_controllable_temp_c=24,
                max_controllable_temp_c=35,
                heating_rate_c_per_min=2.0,
            ),
            manufacturer="Graco",
            model="XP2",
            warm_up_time_minutes=15,
            power_consumption_kw=8.0,
            notes="Mobile spray equipment for on-site foam application",
        ))

        # 5. POURING MACHINE
        self.add_machine(PolyurethaneMachine(
            name="Pouring Machine Batch",
            machine_key="pouring_machine_batch",
            machine_type=MachineType.POURING_MACHINE,
            pressure=PressureSpecification(
                min_pressure_bar=0.5,
                max_pressure_bar=5.0,
                nominal_pressure_bar=1.5,
                pressure_controllable=False,
            ),
            flow=FlowSpecification(
                min_flow_rate_lpm=2.0,
                max_flow_rate_lpm=50.0,
                nominal_flow_rate_lpm=15.0,
                flow_rate_adjustable=True,
                pump_efficiency=0.75,
            ),
            temperature=TemperatureControl(
                min_controllable_temp_c=18,
                max_controllable_temp_c=50,
            ),
            manufacturer="Henkel",
            model="Foamstar",
            cycle_time_seconds=120,
            power_consumption_kw=6.0,
            notes="Batch pouring machine for flexible foam production",
        ))

        # 6. COMPACT LOW PRESSURE
        self.add_machine(PolyurethaneMachine(
            name="Compact Low Pressure",
            machine_key="compact_low_pressure",
            machine_type=MachineType.LOW_PRESSURE,
            pressure=PressureSpecification(
                min_pressure_bar=1.0,
                max_pressure_bar=15.0,
                nominal_pressure_bar=6.0,
            ),
            flow=FlowSpecification(
                min_flow_rate_lpm=0.1,
                max_flow_rate_lpm=30.0,
                nominal_flow_rate_lpm=5.0,
                pump_efficiency=0.80,
            ),
            temperature=TemperatureControl(
                min_controllable_temp_c=15,
                max_controllable_temp_c=50,
            ),
            manufacturer="Linden",
            model="Compact",
            power_consumption_kw=8.0,
            notes="Compact low-pressure machine for small batch production",
        ))

        # 7-10. ADDITIONAL STANDARD MACHINES
        additional_machines = [
            {
                "name": "Industrial High Pressure",
                "key": "industrial_high_pressure",
                "type": MachineType.HIGH_PRESSURE,
                "min_p": 100.0,
                "max_p": 250.0,
                "power": 30.0,
            },
            {
                "name": "Precision RIM",
                "key": "precision_rim",
                "type": MachineType.HIGH_PRESSURE,
                "min_p": 120.0,
                "max_p": 200.0,
                "power": 22.0,
            },
            {
                "name": "Laboratory Scale",
                "key": "laboratory_scale",
                "type": MachineType.LOW_PRESSURE,
                "min_p": 0.5,
                "max_p": 10.0,
                "power": 3.0,
            },
            {
                "name": "Production Spray",
                "key": "production_spray",
                "type": MachineType.SPRAY_EQUIPMENT,
                "min_p": 20.0,
                "max_p": 80.0,
                "power": 15.0,
            },
        ]

        for i, spec in enumerate(additional_machines, 1):
            self.add_machine(PolyurethaneMachine(
                name=spec["name"],
                machine_key=spec["key"],
                machine_type=spec["type"],
                pressure=PressureSpecification(
                    min_pressure_bar=spec["min_p"],
                    max_pressure_bar=spec["max_p"],
                    nominal_pressure_bar=(spec["min_p"] + spec["max_p"]) / 2,
                ),
                power_consumption_kw=spec["power"],
                notes=f"Standard machine type #{i}",
            ))

    def add_machine(self, machine: PolyurethaneMachine):
        """Add standard machine to database"""
        self.machines[machine.machine_key] = machine

    def create_custom_machine(
        self,
        name: str,
        machine_key: str,
        min_pressure_bar: float,
        max_pressure_bar: float,
        min_flow_lpm: float,
        max_flow_lpm: float,
        temp_min_c: float = 15.0,
        temp_max_c: float = 60.0,
    ) -> PolyurethaneMachine:
        """Create and register a custom machine"""
        custom_machine = PolyurethaneMachine(
            name=name,
            machine_key=machine_key,
            machine_type=MachineType.CUSTOM,
            pressure=PressureSpecification(
                min_pressure_bar=min_pressure_bar,
                max_pressure_bar=max_pressure_bar,
                nominal_pressure_bar=(min_pressure_bar + max_pressure_bar) / 2,
            ),
            flow=FlowSpecification(
                min_flow_rate_lpm=min_flow_lpm,
                max_flow_rate_lpm=max_flow_lpm,
                nominal_flow_rate_lpm=(min_flow_lpm + max_flow_lpm) / 2,
            ),
            temperature=TemperatureControl(
                min_controllable_temp_c=temp_min_c,
                max_controllable_temp_c=temp_max_c,
            ),
            notes="Custom machine definition",
        )

        self.custom_machines[machine_key] = custom_machine
        return custom_machine

    def get_machine(self, machine_key: str) -> Optional[PolyurethaneMachine]:
        """Get machine by key"""
        return self.machines.get(machine_key) or self.custom_machines.get(machine_key)

    def list_standard_machines(self) -> List[PolyurethaneMachine]:
        """List all standard machines"""
        return list(self.machines.values())

    def list_custom_machines(self) -> List[PolyurethaneMachine]:
        """List all custom machines"""
        return list(self.custom_machines.values())

    def get_machines_by_type(self, machine_type: MachineType) -> List[PolyurethaneMachine]:
        """Get machines by type"""
        machines = list(self.machines.values()) + list(self.custom_machines.values())
        return [m for m in machines if m.machine_type == machine_type]

    def get_machines_for_pressure_range(
        self,
        min_pressure_bar: float,
        max_pressure_bar: float,
    ) -> List[PolyurethaneMachine]:
        """Find machines suitable for pressure range"""
        machines = list(self.machines.values()) + list(self.custom_machines.values())
        return [
            m for m in machines
            if m.pressure.min_pressure_bar <= min_pressure_bar and
               m.pressure.max_pressure_bar >= max_pressure_bar
        ]

    def check_machine_compatibility(
        self,
        machine_key: str,
        required_pressure_bar: float,
        required_flow_lpm: float,
    ) -> Dict:
        """Check if machine can handle required pressure and flow"""
        machine = self.get_machine(machine_key)
        if not machine:
            return {"compatible": False, "reason": "Machine not found"}

        compatible = True
        issues = []

        # Check pressure
        if required_pressure_bar < machine.pressure.min_pressure_bar:
            issues.append(f"Pressure {required_pressure_bar:.1f} bar too low (min: {machine.pressure.min_pressure_bar:.1f} bar)")
        elif required_pressure_bar > machine.pressure.max_pressure_bar:
            issues.append(f"Pressure {required_pressure_bar:.1f} bar too high (max: {machine.pressure.max_pressure_bar:.1f} bar)")
            compatible = False

        # Check flow
        if required_flow_lpm < machine.flow.min_flow_rate_lpm:
            issues.append(f"Flow {required_flow_lpm:.1f} LPM too low (min: {machine.flow.min_flow_rate_lpm:.1f} LPM)")
        elif required_flow_lpm > machine.flow.max_flow_rate_lpm:
            issues.append(f"Flow {required_flow_lpm:.1f} LPM too high (max: {machine.flow.max_flow_rate_lpm:.1f} LPM)")
            compatible = False

        return {
            "compatible": compatible,
            "machine_name": machine.name,
            "required_pressure_bar": required_pressure_bar,
            "machine_pressure_range": f"{machine.pressure.min_pressure_bar:.1f}-{machine.pressure.max_pressure_bar:.1f}",
            "required_flow_lpm": required_flow_lpm,
            "machine_flow_range": f"{machine.flow.min_flow_rate_lpm:.1f}-{machine.flow.max_flow_rate_lpm:.1f}",
            "issues": issues,
        }

    def get_machine_count(self) -> int:
        """Get total machine count"""
        return len(self.machines) + len(self.custom_machines)
