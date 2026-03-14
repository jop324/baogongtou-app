@echo off
echo ========================================
echo   建筑包工头系统 - Windows 打包脚本
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未安装 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

:: 检查 Rust
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [1/4] 安装 Rust...
    powershell -Command "Invoke-WebRequest -Uri https://win.rustup.rs -OutFile rustup-init.exe"
    rustup-init.exe -y
    del rustup-init.exe
)

echo [1/4] 安装依赖...
cd /d "%~dp0"
cd client
call npm install

echo [2/4] 安装 Tauri CLI...
call npm install @tauri-apps/cli

echo [3/4] 构建应用...
call npx tauri build

echo.
echo ========================================
echo   构建完成！
echo ========================================
echo.
echo 输出目录: client\src-tauri\target\release\bundle
echo.

pause
