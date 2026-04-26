#!/usr/bin/env python3
"""
EcoSort — Simulador de Arduino (Windows / com0com)
===================================================
Simula el lado Arduino del puerto serial virtual.

  ecosort_raspberry.py  →  COM6
  este script           →  COM7

Instalar dependencia:
    pip install pyserial

Uso:
    python ecosort_simulador.py
"""

import serial
import threading
import time

# ══════════════════════════════════════════════════════════════
#  CONFIGURACIÓN
# ══════════════════════════════════════════════════════════════

SIMULADOR_PORT = "COM7"
BAUD_RATE      = 115200
TIMEOUT        = 1

# ══════════════════════════════════════════════════════════════
#  MENÚ — (número, descripción, mensaje serial a enviar)
#
#  Estos son los mensajes que ecosort_raspberry.py sabe leer
#  desde el Arduino (ver función on_serial_message).
# ══════════════════════════════════════════════════════════════

OPCIONES = [
    # ── Parqueos ─────────────────────────────────────────────
    ( 1,  "Parqueos ocupados → 0",                     "parqueos_ocupados,0"),
    ( 2,  "Parqueos ocupados → 1",                     "parqueos_ocupados,1"),
    ( 3,  "Parqueos ocupados → 2",                     "parqueos_ocupados,2"),
    # ── Talanquera ───────────────────────────────────────────
    ( 4,  "Talanquera abierta → true",                 "talanquera_abierta,true"),
    ( 5,  "Talanquera abierta → false",                "talanquera_abierta,false"),
    ( 6,  "Talanquera alerta  → true",                 "talanquera_alerta,true"),
    ( 7,  "Talanquera alerta  → false",                "talanquera_alerta,false"),
    # ── Puerta ───────────────────────────────────────────────
    ( 8,  "Puerta abierta → true",                     "puerta_abierta,true"),
    ( 9,  "Puerta abierta → false",                    "puerta_abierta,false"),
    (10,  "Puerta alarma  → true",                     "puerta_alarma,true"),
    (11,  "Puerta alarma  → false",                    "puerta_alarma,false"),
    # ── Bandas ───────────────────────────────────────────────
    (12,  "Banda principal → activa",                  "banda_principal,true"),
    (13,  "Banda principal → inactiva",                "banda_principal,false"),
    (14,  "Banda plástico  → activa",                  "banda_plastico,true"),
    (15,  "Banda plástico  → inactiva",                "banda_plastico,false"),
    (16,  "Banda vidrio    → activa",                  "banda_vidrio,true"),
    (17,  "Banda vidrio    → inactiva",                "banda_vidrio,false"),
    (18,  "Banda metal     → activa",                  "banda_metal,true"),
    (19,  "Banda metal     → inactiva",                "banda_metal,false"),
    # ── Clasificador: material detectado ────────────────────
    (20,  "Material detectado → 1 (plástico)",         "material_detectado,0"),
    (21,  "Material detectado → 2 (vidrio)",           "material_detectado,1"),
    (22,  "Material detectado → 3 (metal)",            "material_detectado,2"),
    # ── Clasificador: resultado ──────────────────────────────
    (23,  "Resultado plástico → aprobado  (0.85)",     "resultado,plastico,aprobado,0.85"),
    (24,  "Resultado plástico → rechazado (0.10)",     "resultado,plastico,rechazado,0.10"),
    (25,  "Resultado vidrio   → aprobado  (0.92)",     "resultado,vidrio,aprobado,0.92"),
    (26,  "Resultado vidrio   → rechazado (0.10)",     "resultado,vidrio,rechazado,0.10"),
    (27,  "Resultado metal    → aprobado  (0.91)",     "resultado,metal,aprobado,0.91"),
    (28,  "Resultado metal    → rechazado (0.10)",     "resultado,metal,rechazado,0.10"),
    # ── Seguridad ────────────────────────────────────────────
    (29,  "Alarma humo → true  (emergencia)",          "alarma_humo,true,0.95"),
    (30,  "Alarma humo → false (normal)",              "alarma_humo,false,0.10"),
]

# Mapa rápido número → mensaje serial
_MAPA = {num: msg for num, _, msg in OPCIONES}

# ══════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════

def imprimir_menu() -> None:
    print(f"\n{'═' * 58}")
    print("  EcoSort — Simulador de Arduino  |  Menú de comandos")
    print(f"{'═' * 58}")

    secciones = [
        ("🅿️  PARQUEOS",        range( 1,  4)),
        ("🚧 TALANQUERA",       range( 4,  8)),
        ("🚪 PUERTA",           range( 8, 12)),
        ("⚙️  BANDAS",           range(12, 20)),
        ("🔍 MATERIAL DETECT.", range(20, 23)),
        ("📊 RESULTADO CLASIF.",range(23, 29)),
        ("🔥 SEGURIDAD",        range(29, 31))
    ]

    for titulo, rango in secciones:
        print(f"\n  {titulo}")
        print(f"  {'─' * 56}")
        for num, desc, msg in OPCIONES:
            if num in rango:
                print(f"    [{num:>2}]  {desc:<38}  →  {msg}")

    print(f"\n  {'─' * 56}")
    print("    [ m]  Mostrar este menú de nuevo")
    print("    [ 0]  Salir")
    print(f"{'═' * 58}\n")


def enviar(ser: serial.Serial, mensaje: str) -> None:
    try:
        ser.write((mensaje + "\n").encode("utf-8"))
        print(f"  ✅ Enviado → '{mensaje}'")
    except serial.SerialException as e:
        print(f"  ❌ Error al enviar: {e}")


# ══════════════════════════════════════════════════════════════
#  HILO: ESCUCHAR COMANDOS QUE LLEGAN DE LA RASPBERRY
#
#  ecosort_raspberry.py envía estos mensajes seriales al Arduino
#  cuando recibe un comando MQTT del backend:
#
#    banda_<linea>_activa,<true|false>
#    puerta_abierta,<true|false>
#    talanquera_abierta,<true|false>
#    iluminacion,<true|false>
#    emergencia,<true|false>
# ══════════════════════════════════════════════════════════════

def hilo_recibir(ser: serial.Serial, stop_event: threading.Event) -> None:
    while not stop_event.is_set():
        try:
            if ser.in_waiting > 0:
                raw     = ser.readline()
                mensaje = raw.decode("utf-8").strip()
                if mensaje:
                    # Salto de línea para no pisar el prompt del usuario
                    print(f"\n  📥 Raspberry → Arduino: '{mensaje}'")
                    print("  Ingresa opción: ", end="", flush=True)
        except (serial.SerialException, UnicodeDecodeError) as e:
            print(f"\n  ❌ Error RX: {e}")
        time.sleep(0.05)


# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════

def main():
    print("=" * 58)
    print(f"  EcoSort — Simulador  |  {SIMULADOR_PORT} @ {BAUD_RATE} bps")
    print("=" * 58)

    try:
        ser = serial.Serial(port=SIMULADOR_PORT, baudrate=BAUD_RATE, timeout=TIMEOUT)
        time.sleep(2)
        print(f"  ✅ Conectado a {SIMULADOR_PORT}\n")
    except serial.SerialException as e:
        print(f"  ❌ No se pudo abrir {SIMULADOR_PORT}: {e}")
        print("     Verifica que com0com esté activo y que COM7 esté libre.")
        return

    stop_event = threading.Event()
    t_rx = threading.Thread(target=hilo_recibir, args=(ser, stop_event), daemon=True)
    t_rx.start()

    imprimir_menu()

    try:
        while True:
            try:
                entrada = input("  Ingresa opción: ").strip()
            except EOFError:
                break

            if entrada == "":
                continue

            if entrada == "0":
                print("  ⛔ Saliendo...")
                break

            if entrada.lower() == "m":
                imprimir_menu()
                continue

            if not entrada.isdigit():
                print("  ⚠️  Ingresa un número válido  (o 'm' para ver el menú, '0' para salir).")
                continue

            num = int(entrada)
            if num not in _MAPA:
                print(f"  ⚠️  Opción '{num}' no existe. Rango válido: 1–{max(_MAPA)}.")
                continue

            enviar(ser, _MAPA[num])

    except KeyboardInterrupt:
        print("\n  ⛔ Detenido por el usuario (Ctrl+C)")
    finally:
        stop_event.set()
        ser.close()
        print("  👋 Simulador finalizado")


if __name__ == "__main__":
    main()
