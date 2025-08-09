@echo off
REM ===== Iniciar Legalia (Next.js) =====

REM Ir a la carpeta del proyecto
cd /d "C:\Users\Usuario\Desktop\Proyectos\LEGALIA\legalia-web"

REM Abrir navegador en localhost:3000
start "" http://localhost:3000

REM Iniciar servidor de desarrollo
npm run dev
