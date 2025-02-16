'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
require('dotenv').config();
const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);


//подключение модуля Instagram
const instagram = require("./instagram.js");


//подключение модуля определения адреса хоста
const ngrok = require('./get_public_url');


//подключение модуля viber
const viber = require("./viber.js");
const bot = viber.bot;
viber.createWebSocketServer(server);


//определение функций
const renderIndex = function (req, res) {
  res.sendFile(path.resolve(__dirname, 'public/index.html'));
};



//№1
app.use(express.static(path.join(__dirname, "public")));

//№2-
app.get('/api/instagram/getDataInstagram', instagram.getDataInstagram);


//end
app.get('/*', renderIndex);

app.use(bot.middleware());





//запуск сервера
return ngrok.getPublicUrl().then(publicUrl => {
  console.log('Set the new webhook to ', publicUrl);
  server.listen(port, function () {
    bot.setWebhook(publicUrl).then(res => {
      console.log(res);
    }).catch(err => console.log(err));
    console.log(`Server listens http://localhost:${port}`);
    //require('child_process').exec(`start http://localhost:${server.address().port}`);
  });
}).catch(error => {
  console.log('Can not connect to ngrok server. Is it running?');
  console.error(error);

  // server.listen(port, function () {
  //   bot.setWebhook(process.env.WEBHOOK_VIBER_URL).then(res => {
  //     console.log(res);
  //   }).catch(err => console.log(err));
  // });

});

