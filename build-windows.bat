@echo off
REM Build script for Windows

echo Building automobile-complete for Windows...

REM Check if PyInstaller is installed
where pyinstaller >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo PyInstaller is not installed. Installing...
    pip install pyinstaller
)

REM Ensure we're in the project root
cd /d "%~dp0"

REM Clean previous builds
echo Cleaning previous builds...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist *.spec.bak del /q *.spec.bak

REM Build the executable
echo Building executable...
pyinstaller automobile-complete.spec --clean

REM Check if build was successful
if exist "dist\amc.exe" (
    echo Build successful!
    echo Executable location: %CD%\dist\amc.exe
    dir dist\amc.exe
) else (
    echo Build failed - executable not found
    exit /b 1
)

pause

