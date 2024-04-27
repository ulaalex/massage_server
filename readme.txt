Создание исполняемого бинарного файла для nodejs приложения
Сначала собираем проект в один js файл с помощью @zeit/ncc.

npx @zeit/ncc build hello.js -m -o dist



Потом создаем из него исполняемый файл с помощью pkg от vercel. Пример создания exe для windows.

npx pkg -t node10-win dist/index.js --out-path dist