@echo off
echo ========================================
echo    微信支出监测系统 启动脚本
echo ========================================
echo.

echo [1/3] 检查Python环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)
echo     Python已安装

echo.
echo [2/3] 检查依赖包...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo     安装Flask...
    pip install flask flask-cors
)
pip show flask-cors >nul 2>&1
if errorlevel 1 (
    pip install flask-cors
)
echo     依赖检查完成

echo.
echo [3/3] 启动服务...
echo.
echo 请确保手机已通过USB连接到电脑，并开启USB调试模式
echo 访问 http://localhost:5000 查看支出统计
echo.
echo 按 Ctrl+C 停止服务
echo.

cd /d "%~dp0backend"
python server.py
