from fastapi import FastAPI, File, UploadFile
from dotenv import load_dotenv
import easyocr
import cv2
import numpy as np
import re
import os

load_dotenv()

app = FastAPI(title="EcoSort - Plate Recognition API")

OCR_LANG = os.getenv("OCR_LANG", "en")
reader = easyocr.Reader([OCR_LANG], gpu=False)

def normalize_plate(text: str) -> str:
    text = text.upper()
    text = re.sub(r"[^A-Z0-9]", "", text)
    return text

@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "ecosort-plates"
    }

@app.post("/detect-plate")
async def detect_plate(file: UploadFile = File(...)):
    contents = await file.read()

    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        return {
            "success": False,
            "plate": None,
            "message": "No se pudo leer la imagen"
        }

    results = reader.readtext(image)

    candidates = []

    for bbox, text, confidence in results:
        plate = normalize_plate(text)

        if 4 <= len(plate) <= 8 and any(c.isdigit() for c in plate) and any(c.isalpha() for c in plate):
            candidates.append({
                "text": plate,
                "confidence": float(confidence)
            })

    if not candidates:
        return {
            "success": False,
            "plate": None,
            "message": "No se detectó placa",
            "candidates": []
        }

    best = max(
    candidates,
    key=lambda x: (
        1 if 5 <= len(x["text"]) <= 7 else 0,
        x["confidence"]
    )
)

    return {
        "success": True,
        "plate": best["text"],
        "confidence": best["confidence"],
        "candidates": candidates
    }