@echo off
REM Script para desplegar las reglas de Firestore actualizadas
echo Desplegando reglas de Firestore...
echo.

firebase deploy --only firestore:rules

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Reglas desplegadas exitosamente
) else (
    echo.
    echo ✗ Error al desplegar las reglas
)

pause

