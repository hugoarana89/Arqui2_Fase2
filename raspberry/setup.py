import os
import sys
import subprocess
import platform

VENV_DIR = ".venv"

def run_command(command, shell=False):
    print(f"▶ Ejecutando: {command}")
    subprocess.check_call(command, shell=shell)

def main():
    # 1. Crear entorno virtual
    if not os.path.exists(VENV_DIR):
        print("📦 Creando entorno virtual...")
        run_command([sys.executable, "-m", "venv", VENV_DIR])
    else:
        print("✅ El entorno virtual ya existe")

    # 2. Detectar sistema operativo
    is_windows = platform.system() == "Windows"

    # 3. Ruta del pip dentro del venv
    if is_windows:
        pip_path = os.path.join(VENV_DIR, "Scripts", "pip")
        python_path = os.path.join(VENV_DIR, "Scripts", "python")
    else:
        pip_path = os.path.join(VENV_DIR, "bin", "pip")
        python_path = os.path.join(VENV_DIR, "bin", "python")

    # 4. Instalar dependencias
    print("📥 Instalando dependencias...")
    run_command([python_path, "-m", "pip", "install", "--upgrade", "pip"])
    run_command([pip_path, "install", "paho-mqtt==1.6.1"])
    run_command([pip_path, "install", "pyserial"])

    print("✅ Entorno listo")

    run_command([python_path, "ecosort_raspberry.py"])

if __name__ == "__main__":
    main()