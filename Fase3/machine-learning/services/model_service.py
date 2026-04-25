import base64

import cv2
import numpy as np
from fastapi import HTTPException, UploadFile
from pydantic import BaseModel
from huggingface_hub import hf_hub_download
from ultralytics import YOLO


PPE_REQUIREMENTS = {
    "helmet": True,
    "vest": False,
    "safety_shoe": False,
    "gloves": False,
    "goggles": False,
    "mask": False,
}

MODEL_REPO = "Tanishjain9/yolov8n-ppe-detection-6classes"
MODEL_CANDIDATES = ["best.pt", "model.onnx", "best.onnx"]
CONFIDENCE = 0.25
IMAGE_SIZE = 768

model: YOLO | None = None


class PPEResponse(BaseModel):
    access_granted: bool
    missing_mandatory: list[str]
    detections: dict[str, float]
    annotated_image_base64: str


def ensure_model() -> str:
    last_error = None

    for filename in MODEL_CANDIDATES:
        try:
            path = hf_hub_download(repo_id=MODEL_REPO, filename=filename)
            print(f"[Sistema] Archivo descargado y localizado: {filename}")
            return path
        except Exception as e:
            last_error = e

    raise RuntimeError(
        f"No se pudo descargar el modelo desde {MODEL_REPO}. Error: {last_error}"
    )


def load_model() -> None:
    global model

    print("[Sistema] Preparando la Inteligencia Artificial...")
    model_path = ensure_model()
    model = YOLO(model_path)
    print("[Sistema] Servidor listo para controlar accesos.")


async def parse_image_from_request(file: UploadFile) -> np.ndarray:
    try:
        raw_bytes = await file.read()
        arr = np.frombuffer(raw_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("El archivo no es una imagen válida.")

        return img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error leyendo la imagen: {str(e)}")


def run_inference(img: np.ndarray) -> PPEResponse:
    if model is None:
        raise HTTPException(status_code=503, detail="El motor de IA aún está encendiendo. Intenta en unos segundos.")

    results = model(img, imgsz=IMAGE_SIZE, conf=CONFIDENCE, verbose=False)
    result = results[0]
    detections = {}

    if result.boxes is not None and len(result.boxes) > 0:
        class_ids = result.boxes.cls.tolist()
        confidences = result.boxes.conf.tolist()

        for cls_id, conf in zip(class_ids, confidences):
            label = result.names[int(cls_id)].strip().lower()
            conf_val = round(conf, 4)

            if label not in detections or conf_val > detections[label]:
                detections[label] = conf_val

    missing_items = []

    for item_name, is_mandatory in PPE_REQUIREMENTS.items():
        if is_mandatory and item_name not in detections:
            missing_items.append(item_name)

    is_access_granted = len(missing_items) == 0
    annotated_img = result.plot()
    _, buffer = cv2.imencode(".jpg", annotated_img)
    img_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")

    return PPEResponse(
        access_granted=is_access_granted,
        missing_mandatory=missing_items,
        detections=detections,
        annotated_image_base64=img_b64,
    )


def is_model_ready() -> bool:
    return model is not None