@echo off
cd /d "%~dp0"
echo ==============================================
echo AntiGravity Uygulamasi Derleyici
echo ==============================================
echo.
echo Gerekli kutuphaneler (pyinstaller, vb.) kontrol ediliyor...
pip install pyinstaller flask psutil google-api-python-client google-auth-httplib2 google-auth-oauthlib requests

echo.
echo Derleme islemi basliyor... (Eski surum temizleniyor)
pyinstaller --name AntiGravity --add-data "templates;templates" --add-data "static;static" --onefile --clean -y app.py

echo.
if exist "dist\AntiGravity.exe" (
    echo ==============================================
    echo BASARILI: Derleme islemi tamamlandi!
    echo ==============================================
    echo AntiGravity.exe dosyaniz "dist" klasorunun icinde olusturuldu.
    echo Calistirmak icin dist\AntiGravity.exe dosyasina cift tiklayabilirsiniz.
) else (
    echo ==============================================
    echo HATA: Derleme isleminde bir sorun olustu.
    echo ==============================================
)
echo.
pause
