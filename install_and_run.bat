@echo off
REM Откройте "Command Prompt" (Пуск -> cmd) или PowerShell и запустите этот файл.
setlocal
where python >nul 2>&1
if errorlevel 1 (
  echo Не найден Python. Установите Python 3: https://www.python.org
  pause
  exit /b 1
)
echo Запуск локального сервера на http://localhost:8000
python -m http.server 8000
endlocal
