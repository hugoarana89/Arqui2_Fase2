from fastapi import FastAPI

from routes.routes import router
from services.model_service import load_model


app = FastAPI(
    title="PPE Access Control API",
    description="Recibe una imagen, detecta equipo de protección, y decide si otorga acceso en base a reglas predefinidas.",
    version="2.0.0",
)


@app.on_event("startup")
def startup() -> None:
    load_model()


app.include_router(router)