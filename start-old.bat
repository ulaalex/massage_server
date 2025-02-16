@chcp 65001
cd "C:\Users\Алексей\Desktop\it\angular\server"

tuna service install -- tuna http 3000
tuna service start --name=tuna
timeout /t 3
node server

tuna service stop --name=tuna
