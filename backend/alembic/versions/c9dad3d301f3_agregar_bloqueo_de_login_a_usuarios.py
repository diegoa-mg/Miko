"""agregar intentos_fallidos y bloqueado_hasta a usuarios

Revision ID: c9dad3d301f3
Revises: c1a8e2b34d56
Create Date: 2026-11-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9dad3d301f3'
down_revision: Union[str, Sequence[str], None] = 'c1a8e2b34d56'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # server_default='0': los usuarios que ya existen quedan con 0 intentos (sin esto la columna NOT NULL fallaría)
    op.add_column('usuarios', sa.Column('intentos_fallidos', sa.Integer(), server_default='0', nullable=False))
    # NULL = la cuenta no está bloqueada
    op.add_column('usuarios', sa.Column('bloqueado_hasta', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('usuarios', 'bloqueado_hasta')
    op.drop_column('usuarios', 'intentos_fallidos')
