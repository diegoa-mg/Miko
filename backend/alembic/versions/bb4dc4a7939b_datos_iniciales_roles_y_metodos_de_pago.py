"""datos iniciales: roles y metodos de pago

Revision ID: bb4dc4a7939b
Revises: b0d6b913554a
Create Date: 2026-09-23 14:19:47.096364

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bb4dc4a7939b'
down_revision: Union[str, Sequence[str], None] = 'b0d6b913554a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("INSERT INTO roles(nombre) VALUES ('admin_general'), ('gerente_sede'), ('cajero') ON CONFLICT (nombre) DO NOTHING")
    op.execute("INSERT INTO metodos_pago(nombre) VALUES ('efectivo'), ('tarjeta'), ('transferencia') ON CONFLICT (nombre) DO NOTHING")


def downgrade() -> None:
    op.execute("DELETE FROM roles WHERE nombre IN ('admin_general', 'gerente_sede', 'cajero')")
    op.execute("DELETE FROM metodos_pago WHERE nombre IN ('efectivo', 'tarjeta', 'transferencia')")