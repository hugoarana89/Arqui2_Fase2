#!/usr/bin/env python3

"""Cliente local para probar la API de verificación EPP a través del backend.

Por defecto prueba contra el backend desplegado en la nube.
También permite probar directamente contra el modelo EPP especificando --model.

Lee HOST, PORT y BACKEND_HOST desde el archivo .env del directorio.

Uso (Backend - recomendado):
    python local_test_client.py --image /ruta/a/foto.jpg
    python local_test_client.py --camera

Uso (Modelo EPP directo - debug):
    python local_test_client.py --image /ruta/a/foto.jpg --model
    python local_test_client.py --camera --model --host 35.222.3.78 --port 8080
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
BACKEND_ENDPOINT = "/api/epp/verify"
MODEL_ENDPOINT = "/api/ppe/analyze"


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
    
    # Modo: probar contra backend desplegado o modelo local
    if args.model:
        # Probar directamente contra el modelo EPP
        host = args.host or os.getenv("HOST", "127.0.0.1")
        port = args.port or os.getenv("PORT", "8080")
        endpoint = MODEL_ENDPOINT
    else:
        # Probar contra backend desplegado (modo por defecto)
        host = args.host or os.getenv("BACKEND_HOST", "34.9.126.151")
        port = args.port or os.getenv("BACKEND_PORT", "4000")
        endpoint = BACKEND_ENDPOINT
    
    return f"http://{host}:{port}{endpoint}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prueba del endpoint PPE a través del backend")
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--image", help="Ruta de la imagen a enviar")
    source_group.add_argument("--camera", action="store_true", help="Tomar una foto desde la webcam y enviarla")
    parser.add_argument(
        "--model",
        action="store_true",
        help="Probar contra el modelo EPP directo en lugar del backend (debug)",
    )
    parser.add_argument(
        "--url",
        default=None,
        help="URL completa del endpoint",
    )
    parser.add_argument(
        "--host",
        default=None,
        help="Host de la API. Por defecto: backend (34.9.126.151) o modelo local si --model",
    )
    parser.add_argument(
        "--port",
        default=None,
        help="Puerto de la API. Por defecto: backend (4000) o modelo (8080) si --model",
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
    parser.add_argument(
        "--compress",
        type=int,
        default=85,
        help="Calidad JPEG para compresión (1-100). Por defecto: 85. Usar 0 para deshabilitar.",
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


def compress_image(image_bytes: bytes, quality: int) -> bytes:
    """Comprime la imagen a la calidad especificada (1-100)."""
    if quality <= 0 or quality >= 100:
        return image_bytes  # Sin compresión
    
    try:
        from PIL import Image
        from io import BytesIO
        
        img = Image.open(BytesIO(image_bytes))
        output = BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        return output.getvalue()
    except ImportError:
        print("⚠️  Pillow no instalado. Saltando compresión.")
        return image_bytes
    except Exception as e:
        print(f"⚠️  Error al comprimir: {e}. Usando imagen original.")
        return image_bytes


def post_image_backend(url: str, filename: str, file_bytes: bytes) -> tuple[int, str]:
    """Envía la imagen como JSON con base64 (para backend)."""
    image_base64 = base64.b64encode(file_bytes).decode("utf-8")
    payload = json.dumps({
        "imageBase64": image_base64,
        "source": "local_test_client"
    }).encode("utf-8")
    
    request = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            status_code = response.status
            response_text = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        status_code = error.code
        response_text = error.read().decode("utf-8", errors="replace")

    return status_code, response_text


def post_image_model(url: str, filename: str, file_bytes: bytes) -> tuple[int, str]:
    """Envía la imagen como multipart/form-data (para modelo EPP directo)."""
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


def post_image(url: str, filename: str, file_bytes: bytes, is_model: bool) -> tuple[int, str]:
    """Envía la imagen en el formato apropiado según el destino."""
    if is_model:
        return post_image_model(url, filename, file_bytes)
    else:
        return post_image_backend(url, filename, file_bytes)


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
    is_model = args.model
    
    mode = "modelo EPP directo" if is_model else "backend desplegado"
    print(f"\n🔗 Enviando a {mode}")
    print(f"📍 URL: {url}\n")

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

        original_size = len(image_bytes)
        image_bytes = compress_image(image_bytes, args.compress)
        compressed_size = len(image_bytes)
        if original_size != compressed_size:
            ratio = (1 - compressed_size / original_size) * 100
            print(f"📦 Comprimida: {original_size}B → {compressed_size}B ({ratio:.1f}% reducción)")

        status_code, response_text = post_image(url, filename, image_bytes, is_model)
    else:
        image_path = Path(args.image)

        if not image_path.exists():
            print(f"No existe la imagen: {image_path}")
            return 1

        image_bytes = image_path.read_bytes()
        original_size = len(image_bytes)
        image_bytes = compress_image(image_bytes, args.compress)
        compressed_size = len(image_bytes)
        if original_size != compressed_size:
            ratio = (1 - compressed_size / original_size) * 100
            print(f"📦 Comprimida: {original_size}B → {compressed_size}B ({ratio:.1f}% reducción)")

        status_code, response_text = post_image(url, image_path.name, image_bytes, is_model)

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