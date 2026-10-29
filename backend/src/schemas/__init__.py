from src.schemas.auth import LoginRequest, TokenResponse
from src.schemas.usuarios import UsuarioOut, CuentaUpdateData, CuentaUpdatePassword, PasswordSegura
from src.schemas.sucursales import (
    SucursalBase,
    SucursalCreate,
    SucursalUpdate,
    SucursalOut,
    SucursalEliminarResponse,
)
from src.schemas.gerentes import GerenteCreate, GerenteUpdate
from src.schemas.cajeros import CajeroCreate, CajeroUpdate
from src.schemas.dashboard import (
    AlertaInventario,
    DashboardAdminResponse,
    DashboardGerenteResponse,
    DashboardCajeroResponse,
    SucursalInfo,
    VentaResumen,
)
from src.schemas.inventarios import InventarioOut, InventarioUpdate
from src.schemas.categorias import CategoriaOut, CategoriaCreate
from src.schemas.productos import ProductoOut, ProductoCreate, ProductoUpdate
from src.schemas.ventas import (
    MetodoPagoOut,
    DetalleVentaCreate,
    VentaCreate,
    DetalleVentaOut,
    VentaOut,
    VentaUpdate,
    TicketProducto,
    TicketOut,
)
from src.schemas.aviso_privacidad import AceptarAvisoRequest