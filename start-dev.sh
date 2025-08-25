#!/bin/bash

echo "========================================"
echo "    Oto Parca Panel - Local Development"
echo "========================================"
echo

echo "Checking if .env file exists..."
if [ ! -f ".env" ]; then
    echo ".env file not found! Creating from .env.example..."
    cp ".env.example" ".env"
    echo "Please edit .env file with your database credentials and run this script again."
    exit 1
fi

echo "Starting Backend..."
gnome-terminal --title="Backend" -- bash -c "cd backend && npm run start:dev; exec bash" 2>/dev/null || \
xterm -title "Backend" -e "cd backend && npm run start:dev; bash" 2>/dev/null || \
open -a Terminal "cd backend && npm run start:dev" 2>/dev/null || \
echo "Please manually run: cd backend && npm run start:dev"

echo "Waiting 5 seconds for backend to start..."
sleep 5

echo "Starting Frontend..."
gnome-terminal --title="Frontend" -- bash -c "cd frontend && npm run dev; exec bash" 2>/dev/null || \
xterm -title "Frontend" -e "cd frontend && npm run dev; bash" 2>/dev/null || \
open -a Terminal "cd frontend && npm run dev" 2>/dev/null || \
echo "Please manually run: cd frontend && npm run dev"

echo
echo "========================================"
echo "    Services are starting..."
echo "========================================"
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:3001/api/docs"
echo "========================================"
echo
echo "Press Ctrl+C to stop all services"

# Keep script running
while true; do
    sleep 1
done