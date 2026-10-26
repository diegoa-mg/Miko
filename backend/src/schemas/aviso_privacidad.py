from pydantic import BaseModel


class AceptarAvisoRequest(BaseModel):
    token: str
