@echo off
echo ========================================
echo  Building Restrictia: Island Overdrive
echo ========================================
C:\msys64\ucrt64\bin\g++.exe -o Restrictia.exe main.cpp -IC:/msys64/ucrt64/include -LC:/msys64/ucrt64/lib -lraylib -lglfw3 -lopengl32 -lgdi32 -lwinmm -O2 -std=c++17
if %ERRORLEVEL% EQU 0 (
    echo.
    echo  BUILD SUCCESSFUL - Restrictia.exe ready!
    echo ========================================
) else (
    echo.
    echo  BUILD FAILED
    echo ========================================
    pause
)
