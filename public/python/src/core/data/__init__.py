"""
Data modules for polyurethane material and machine databases.

- materials_database: Core material definitions (Genfoam, Ecomate, Ecofoam)
- extended_materials_database: Extended material properties and processing windows
"""

from .materials_database import (
    BlowingAgent,
    PolyurethaneMaterial,
    MaterialDatabase,
    get_material,
    list_materials,
    GENFOAM_HD12,
    GENFOAM_HD20,
    ECOMATE_SPRAY,
    ECOFOAM_XHD_RC,
)

from .extended_materials_database import (
    MaterialFamily,
    ExtendedPolyurethaneMaterial,
    ExtendedMaterialDatabase,
)

__all__ = [
    # materials_database
    'BlowingAgent',
    'PolyurethaneMaterial',
    'MaterialDatabase',
    'get_material',
    'list_materials',
    'GENFOAM_HD12',
    'GENFOAM_HD20',
    'ECOMATE_SPRAY',
    'ECOFOAM_XHD_RC',
    # extended_materials_database
    'MaterialFamily',
    'ExtendedPolyurethaneMaterial',
    'ExtendedMaterialDatabase',
]
