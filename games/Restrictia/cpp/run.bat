@echo off
call build.bat
if %ERRORLEVEL% EQU 0 (
    echo Starting Restrictia...
    start Restrictia.exe
)
