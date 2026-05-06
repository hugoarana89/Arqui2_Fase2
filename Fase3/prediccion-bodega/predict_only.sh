#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
python prediction_service.py
