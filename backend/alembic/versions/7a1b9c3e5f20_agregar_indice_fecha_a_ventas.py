"""agregar indice fecha a ventas

Revision ID: 7a1b9c3e5f20
Revises: 39c2fd2128ae
Create Date: 2026-10-28 19:31:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a1b9c3e5f20'
down_revision: Union[str, Sequence[str], None] = '39c2fd2128ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index('ix_ventas_fecha', 'ventas', ['fecha'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_ventas_fecha', table_name='ventas')
