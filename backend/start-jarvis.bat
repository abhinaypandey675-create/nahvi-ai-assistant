@echo off
title NAHVI Launcher
echo Starting NAHVI...

start "Frontend" cmd /k "cd /d C:\Users\SR Pandey\NAHVI-ultimate\frontend && npm run dev"

timeout /t 3 /nobreak

start "Backend" cmd /k "cd /d C:\Users\SR Pandey\NAHVI-ultimate\backend && node server.js"

timeout /t 2 /nobreak

start "Electron" cmd /k "cd /d C:\Users\SR Pandey\NAHVI-ultimate && npm start"

echo NAHVI is launching...
exit