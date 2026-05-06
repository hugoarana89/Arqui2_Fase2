from fastapi import APIRouter, File, UploadFile

from services.model_service import PPEResponse, is_model_ready, parse_image_from_request, run_inference


router = APIRouter()


@router.post(
    "/api/ppe/analyze",
    response_model=PPEResponse,
    summary="Analiza una imagen subida por formulario para control de acceso",
)
async def analyze_ppe(file: UploadFile = File(...)):
    img_matrix = await parse_image_from_request(file)
    return run_inference(img_matrix)


@router.get("/health")
def health():
    return {"status": "ok", "engine_ready": is_model_ready()}