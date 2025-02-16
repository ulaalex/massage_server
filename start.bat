@chcp 65001
cd "C:\Users\Алексей\Desktop\it\angular\server"
cmd /c start "ngrok" ..\ngrok http --domain=adjusted-panda-promoted.ngrok-free.app 3000
timeout /t 3
node t
pause
