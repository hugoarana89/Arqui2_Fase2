#!/usr/bin/env python3

"""Cliente local para probar placas usando las imágenes de test_images/.

Por defecto envía las imágenes al backend desplegado en la nube.
También permite probar directamente el modelo ml-plates con --model.

Lee HOST, PORT, BACKEND_HOST y BACKEND_PORT desde el archivo .env.

Uso (backend - recomendado):
    python local_test_client.py
    python local_test_client.py --dir test_images
    python local_test_client.py --image test_images/placa1.jpg

Uso (modelo directo - debug):
    python local_test_client.py --model
    python local_test_client.py --model --dir test_images
    python local_test_client.py --model --host 34.27.190.151 --port 8000
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path


MODEL_DIR = Path(__file__).resolve().parent
ENV_FILE = MODEL_DIR / ".env"
BACKEND_PATH = "/api/plates/detect"
VALIDATE_PATH = "/api/plates/validate"
MODEL_PATH = "/detect-plate"
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


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
    if args.model:
        host = args.host or os.getenv("HOST", "127.0.0.1")
        port = args.port or os.getenv("PORT", "8000")
        path = MODEL_PATH
    else:
        host = args.host or os.getenv("BACKEND_HOST", "34.9.126.151")
        port = args.port or os.getenv("BACKEND_PORT", "4000")
        path = BACKEND_PATH

    return f"http://{host}:{port}{path}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prueba de detección de placas con imágenes de test_images")
    parser.add_argument(
        "--model",
        action="store_true",
        help="Probar contra el modelo ml-plates directo en lugar del backend (debug)",
    )
    parser.add_argument(
        "--image",
        default=None,
        help="Ruta de una imagen individual a enviar. Si no se pasa, se usa el directorio test_images.",
    )
    parser.add_argument(
        "--dir",
        default=str(MODEL_DIR / "test_images"),
        help="Directorio con imágenes de prueba a procesar (por defecto: test_images)",
    )
    parser.add_argument(
        "--url",
        default=None,
        help="URL completa del endpoint FastAPI",
    )
    parser.add_argument(
        "--host",
        default=None,
        help="Host de la API. Por defecto: backend (34.9.126.151) o modelo local si --model",
    )
    parser.add_argument(
        "--port",
        default=None,
        help="Puerto de la API. Por defecto: backend (4000) o modelo (8000) si --model",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="Tiempo máximo de espera por petición en segundos",
    )
    return parser.parse_args()


def build_multipart_form(field_name: str, filename: str, file_bytes: bytes) -> tuple[bytes, str]:
    boundary = f"----PlateClient{uuid.uuid4().hex}"
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


def post_image_model(url: str, filename: str, file_bytes: bytes, timeout: float) -> tuple[int, str]:
    body, boundary = build_multipart_form("file", filename, file_bytes)
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace")


def post_image_backend(url: str, file_bytes: bytes, timeout: float) -> tuple[int, str]:
    image_base64 = base64.b64encode(file_bytes).decode("utf-8")
    payload = json.dumps({
        "imageBase64": image_base64,
        "source": "local_test_client",
    }).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace")


def post_validate_backend(url: str, plate: str | None, confidence: float | None, timeout: float) -> tuple[int, str]:
    payload = json.dumps({
        "plate": plate,
        "confidence": confidence,
        "source": "local_test_client",
    }).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace")


def post_image(url: str, filename: str, file_bytes: bytes, timeout: float, is_model: bool) -> tuple[int, str]:
    if is_model:
        return post_image_model(url, filename, file_bytes, timeout)
    return post_image_backend(url, file_bytes, timeout)


def collect_images(image_path: str | None, directory: str) -> list[Path]:
    if image_path:
        path = Path(image_path)
        return [path]

    folder = Path(directory)
    if not folder.exists():
        raise FileNotFoundError(f"No existe el directorio: {folder}")

    images = [
        path
        for path in sorted(folder.iterdir())
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    ]
    if not images:
        raise FileNotFoundError(f"No se encontraron imágenes válidas en: {folder}")

    return images


def main() -> int:
    args = parse_args()
    url = resolve_url(args)
    is_model = args.model

    try:
        images = collect_images(args.image, args.dir)
    except FileNotFoundError as exc:
        print(str(exc))
        return 1

    mode = "modelo directo" if is_model else "backend desplegado"
    print(f"Endpoint ({mode}): {url}")
    print(f"Imágenes a probar: {len(images)}")

    exit_code = 0
    for image_path in images:
        if not image_path.exists():
            print(f"[ERROR] No existe la imagen: {image_path}")
            exit_code = 1
            continue

        file_bytes = image_path.read_bytes()
        status_code, response_text = post_image(url, image_path.name, file_bytes, args.timeout, is_model)

        print(f"\n[{image_path.name}] HTTP {status_code}")

        if status_code >= 400:
            print(response_text)
            exit_code = 1
            continue

        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            print(response_text)
            exit_code = 1
            continue

        if isinstance(data, dict) and data.get("status") == "success" and isinstance(data.get("data"), dict):
            data = data["data"]

        print(json.dumps(data, indent=2, ensure_ascii=False))

        if not is_model:
            plate = data.get("plate") if isinstance(data, dict) else None
            confidence = data.get("confidence") if isinstance(data, dict) else None

            validate_status, validate_text = post_validate_backend(
                f"http://{os.getenv('BACKEND_HOST', '34.9.126.151')}:{os.getenv('BACKEND_PORT', '4000')}{VALIDATE_PATH}",
                plate if isinstance(plate, str) or plate is None else None,
                confidence if isinstance(confidence, (int, float)) or confidence is None else None,
                args.timeout,
            )

            print(f"[{image_path.name}] VALIDATE HTTP {validate_status}")

            if validate_status >= 400:
                print(validate_text)
                exit_code = 1
                continue

            try:
                validate_data = json.loads(validate_text)
            except json.JSONDecodeError:
                print(validate_text)
                exit_code = 1
                continue

            print(json.dumps(validate_data, indent=2, ensure_ascii=False))

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())