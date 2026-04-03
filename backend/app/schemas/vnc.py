from pydantic import BaseModel


class VNCBootstrapResponse(BaseModel):
    node_id: int
    node_name: str
    vmid: int
    websocket_url: str | None
    password: str | None
    message: str
