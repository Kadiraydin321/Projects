@echo off
echo Windows Yönetici Kurulumu
echo.

REM Create project directory
mkdir C:\WindowsManager

REM Copy files to project directory
copy requirements.txt C:\WindowsManager\
copy windows_manager.py C:\WindowsManager\
copy setup.py C:\WindowsManager\
copy README.md C:\WindowsManager\
copy installer.bat C:\WindowsManager\

echo.
echo Proje dosyaları oluşturuldu.
echo Gerekli paketleri yüklemek için "pip install -r requirements.txt" komutunu çalıştırın.
echo.
pause