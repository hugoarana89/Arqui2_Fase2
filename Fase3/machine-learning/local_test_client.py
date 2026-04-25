#!/usr/bin/env python3

"""Cliente local para probar la API de verificación EPP sin Raspberry.

Uso:
    python local_test_client.py --image /ruta/a/foto.jpg
    python local_test_client.py --image /ruta/a/foto.jpg --url http://127.0.0.1:8000/api/ppe/analyze --save-annotated out.jpg
"""

from __future__ import annotations

import argparse
import base64
import json
import time
from pathlib import Path

import cv2
import requests


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prueba local del endpoint PPE")
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--image", help="Ruta de la imagen a enviar")
    source_group.add_argument("--camera", action="store_true", help="Tomar una foto desde la webcam y enviarla")
    parser.add_argument(
        "--url",
        default="http://127.0.0.1:8000/api/ppe/analyze",
        help="URL del endpoint FastAPI",
    )
    parser.add_argument(
        "--camera-index",
        type=int,
        default=0,
        help="Índice de la webcam a usar cuando se activa --camera",
    )
    parser.add_argument(
        "--warmup-seconds",
        type=float,
        default=0.5,
        help="Tiempo de espera para estabilizar la webcam antes de capturar",
    )
    parser.add_argument(
        "--save-captured",
        default=None,
        help="Ruta opcional para guardar la foto capturada desde la webcam",
    )
    parser.add_argument(
        "--save-annotated",
        default=None,
        help="Ruta opcional para guardar la imagen anotada devuelta por la API",
    )
    parser.add_argument(
        "--save-json",
        default=None,
        help="Ruta opcional para guardar la respuesta JSON devuelta por la API",
    )
    return parser.parse_args()


def capture_from_camera(camera_index: int, warmup_seconds: float) -> tuple[str, bytes]:
    capture = cv2.VideoCapture(camera_index)
    if not capture.isOpened():
        raise RuntimeError(f"No se pudo abrir la webcam en el índice {camera_index}")

    try:
        time.sleep(warmup_seconds)
        ok, frame = capture.read()
        if not ok or frame is None:
            raise RuntimeError("No se pudo leer un frame válido desde la webcam")

        ok, encoded = cv2.imencode(".jpg", frame)
        if not ok:
            raise RuntimeError("No se pudo codificar la captura en JPEG")

        return f"camera_{camera_index}.jpg", encoded.tobytes()
    finally:
        capture.release()


def countdown(seconds: int) -> None:
    for remaining in range(seconds, 0, -1):
        print(f"Tomando foto en {remaining}...")
        time.sleep(1)
    print("Capturando ahora.")


def main() -> int:
    args = parse_args()

    if args.camera:
        countdown(3)
        filename, image_bytes = capture_from_camera(args.camera_index, args.warmup_seconds)
        if args.save_captured:
            Path(args.save_captured).write_bytes(image_bytes)
            print(f"Foto capturada guardada en: {args.save_captured}")

        response = requests.post(
            args.url,
            files={"file": (filename, image_bytes, "image/jpeg")},
            timeout=30,
        )
    else:
        image_path = Path(args.image)

        if not image_path.exists():
            print(f"No existe la imagen: {image_path}")
            return 1

        with image_path.open("rb") as image_file:
            response = requests.post(
                args.url,
                files={"file": (image_path.name, image_file, "image/jpeg")},
                timeout=30,
            )

    print(f"HTTP {response.status_code}")
    response.raise_for_status()

    data = response.json()
    print(json.dumps(data, indent=2, ensure_ascii=False))

    if args.save_json:
        Path(args.save_json).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Respuesta JSON guardada en: {args.save_json}")

    if args.save_annotated:
        annotated = data.get("annotated_image_base64", "")
        if not annotated.startswith("data:image/"):
            print("La respuesta no incluye annotated_image_base64 válido")
            return 1

        header, encoded = annotated.split(",", 1)
        output_path = Path(args.save_annotated)
        output_path.write_bytes(base64.b64decode(encoded))
        print(f"Imagen anotada guardada en: {output_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())