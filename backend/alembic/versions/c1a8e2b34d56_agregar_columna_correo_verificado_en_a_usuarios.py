"""agregar correo_verificado_en a usuarios

Revision ID: c1a8e2b34d56
Revises: 7458d6a39180
Create Date: 2026-11-12 10:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a8e2b34d56'
down_revision: Union[str, Sequence[str], None] = '7458d6a39180'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('usuarios', sa.Column('correo_verificado_en', sa.DateTime(), nullable=True))
    # Dejar como verificados los correos de los usuarios existentes
    op.execute("UPDATE usuarios SET correo_verificado_en = now()")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('usuarios', 'correo_verificado_en')
