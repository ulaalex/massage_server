@chcp 65001
cd "C:\Users\Алексей\OneDrive\angular\server"
cmd /c start "ngrok" .\ngrok http 3000
timeout /t 3
node server
pause
