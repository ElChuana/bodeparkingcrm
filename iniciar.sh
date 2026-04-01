#!/bin/bash
echo "Iniciando BodeParking CRM..."

# Backend
cd "$(dirname "$0")/backend"
npm run dev &
BACKEND_PID=$!

# Frontend
cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Backend:  http://localhost:3001"
echo "✅ Frontend: http://localhost:5173"
echo ""
echo "Presiona Ctrl+C para detener ambos servidores"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
