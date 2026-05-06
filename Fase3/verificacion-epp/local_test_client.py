#!/usr/bin/env python3

"""Cliente local para probar la API de verificación EPP sin Raspberry.

Lee HOST y PORT desde el archivo .env del directorio del modelo.

Uso:
    python local_test_client.py --image /ruta/a/foto.jpg
    python local_test_client.py --camera
    python local_test_client.py --image /ruta/a/foto.jpg --host 127.0.0.1 --port 8000
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import urllib.error
import urllib.request
import uuid
import time
from pathlib import Path


MODEL_DIR = Path(__file__).resolve().parent
ENV_FILE = MODEL_DIR / ".env"
DEFAULT_PATH = "/api/ppe/analyze"


def load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def resolve_url(args: argparse.Namespace) -> str:
    if args.url:
        return args.url

    load_env_file(ENV_FILE)
    host = args.host or os.getenv("HOST", "127.0.0.1")
    port = args.port or os.getenv("PORT", "8080")
    return f"http://{host}:{port}{DEFAULT_PATH}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prueba local del endpoint PPE")
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--image", help="Ruta de la imagen a enviar")
    source_group.add_argument("--camera", action="store_true", help="Tomar una foto desde la webcam y enviarla")
    parser.add_argument(
        "--url",
        default=None,
        help="URL completa del endpoint FastAPI",
    )
    parser.add_argument(
        "--host",
        default=None,
        help="Host de la API. Si no se pasa, se lee desde .env",
    )
    parser.add_argument(
        "--port",
        default=None,
        help="Puerto de la API. Si no se pasa, se lee desde .env",
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
    try:
        import cv2
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Para usar --camera necesitas instalar opencv-python u opencv-python-headless en la venv."
        ) from exc

    candidate_indexes = [camera_index]
    candidate_indexes.extend(index for index in range(0, 6) if index != camera_index)

    capture = None
    selected_index = None

    for index in candidate_indexes:
        trial_capture = cv2.VideoCapture(index)
        if trial_capture.isOpened():
            capture = trial_capture
            selected_index = index
            break
        trial_capture.release()

    if capture is None or selected_index is None:
        available = ", ".join(str(index) for index in candidate_indexes)
        raise RuntimeError(f"No se pudo abrir ninguna webcam en los índices probados: {available}")

    try:
        time.sleep(warmup_seconds)
        ok, frame = capture.read()
        if not ok or frame is None:
            raise RuntimeError("No se pudo leer un frame válido desde la webcam")

        ok, encoded = cv2.imencode(".jpg", frame)
        if not ok:
            raise RuntimeError("No se pudo codificar la captura en JPEG")

        return f"camera_{selected_index}.jpg", encoded.tobytes()
    finally:
        capture.release()


def countdown(seconds: int) -> None:
    for remaining in range(seconds, 0, -1):
        print(f"Tomando foto en {remaining}...")
        time.sleep(1)
    print("Capturando ahora.")


def build_multipart_form(field_name: str, filename: str, file_bytes: bytes) -> tuple[bytes, str]:
    boundary = f"----PPEClient{uuid.uuid4().hex}"
    parts = [
        f"--{boundary}\r\n".encode("utf-8"),
        (
            f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'
            "Content-Type: image/jpeg\r\n\r\n"
        ).encode("utf-8"),
        file_bytes,
        b"\r\n",
        f"--{boundary}--\r\n".encode("utf-8"),
    ]
    return b"".join(parts), boundary


def post_image(url: str, filename: str, file_bytes: bytes) -> tuple[int, str]:
    body, boundary = build_multipart_form("file", filename, file_bytes)
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            status_code = response.status
            payload = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        status_code = error.code
        payload = error.read().decode("utf-8", errors="replace")

    return status_code, payload


def resolve_output_path(output_arg: str | None, default_filename: str) -> Path | None:
    if not output_arg:
        return None

    output_path = Path(output_arg)
    if output_path.exists() and output_path.is_dir():
        return output_path / default_filename

    if output_arg.endswith(("/", os.sep)):
        return output_path / default_filename

    if output_path.suffix:
        return output_path

    return output_path / default_filename


def main() -> int:
    args = parse_args()
    url = resolve_url(args)

    save_captured_path = resolve_output_path(args.save_captured, "captured.jpg")
    save_json_path = resolve_output_path(args.save_json, "response.json")
    save_annotated_path = resolve_output_path(args.save_annotated, "annotated.jpg")

    if args.camera:
        try:
            countdown(3)
            filename, image_bytes = capture_from_camera(args.camera_index, args.warmup_seconds)
        except RuntimeError as exc:
            print(str(exc))
            return 1

        if save_captured_path:
            save_captured_path.parent.mkdir(parents=True, exist_ok=True)
            save_captured_path.write_bytes(image_bytes)
            print(f"Foto capturada guardada en: {save_captured_path}")

        status_code, response_text = post_image(url, filename, image_bytes)
    else:
        image_path = Path(args.image)

        if not image_path.exists():
            print(f"No existe la imagen: {image_path}")
            return 1

        image_bytes = image_path.read_bytes()
        status_code, response_text = post_image(url, image_path.name, image_bytes)

    print(f"HTTP {status_code}")

    if status_code >= 400:
        print(response_text)
        return 1

    data = json.loads(response_text)
    print(json.dumps(data, indent=2, ensure_ascii=False))

    if save_json_path:
        save_json_path.parent.mkdir(parents=True, exist_ok=True)
        save_json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Respuesta JSON guardada en: {save_json_path}")

    if save_annotated_path:
        annotated = data.get("annotated_image_base64", "")
        if not annotated.startswith("data:image/"):
            print("La respuesta no incluye annotated_image_base64 válido")
            return 1

        header, encoded = annotated.split(",", 1)
        output_path = save_annotated_path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(base64.b64decode(encoded))
        print(f"Imagen anotada guardada en: {output_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())