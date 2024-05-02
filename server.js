'use strict';

const express = require('express');
const http = require('http');
const path = require('path');

const WebSocket = require('ws');
const jsonParser = express.json();
const prompt = require('prompt');
const colors = require("@colors/colors/safe");
const process = require("node:process");
require('dotenv').config();

//viber
const ngrok = require('./get_public_url');
const ViberBot = require('viber-bot').Bot;
const BotEvents = require('viber-bot').Events;
const TextMessage = require('viber-bot').Message.Text;
//создание профиля пользователя 
const userViber = {
  id: process.env.USER_VIBER_ID,
  name: process.env.USER_VIBER_NAME,
  avatar: process.env.USER_VIBER_AVATAR,
  language: process.env.USER_VIBER_LANGUAGE,
  country: process.env.USER_VIBER_COUNTRY,
}
//создание бота на сервере
const bot = new ViberBot({
  authToken: process.env.VIBER_BOT_AUTHTOKEN,
  name: process.env.VIBER_BOT_NAME,
  avatar: process.env.VIBER_BOT_AVATAR,
});


const app = express();
const server = http.createServer(app);
const wsServer = new WebSocket.Server({ server });

let activeWsClient;
let clients = [];
let timerActiveWsClient;
let previousActiveWsClient;

class Message {
  userAvatar = "";
  constructor(type, messageContent, userName = '', actionOnMessage) {
    this.type = type;
    this.messageContent = messageContent;
    this.userName = userName;
    this.actionOnMessage = actionOnMessage;
  }
}




// отправка сообщений от пользователя viber через бота клиенту 
bot.on(BotEvents.MESSAGE_RECEIVED, (messageViberInput, response) => {
  console.log(response.userProfile);
  if (response.userProfile.id === userViber.id && activeWsClient === previousActiveWsClient && activeWsClient) {
    let messageOutput = new Message("userMessage", messageViberInput.text, response.userProfile.name);
    messageOutput.userAvatar = response.userProfile.avatar;
    let messageOutputJson = JSON.stringify(messageOutput);
    activeWsClient.send(messageOutputJson);
  } else
    if (response.userProfile.id === userViber.id && activeWsClient !== previousActiveWsClient && activeWsClient) {
      response.send(new TextMessage(`Предыдущий клиет отключился, дождитесь сообщения от нового клиента. Сообщение: "${messageViberInput.text}" не доставлено!`));
    } else
      if (response.userProfile.id === userViber.id && !activeWsClient) {
        response.send(new TextMessage(`Нет активных клиентов.Сообщение: "${messageViberInput.text}" не доставлено!`));
      }
      else if (response.userProfile.id !== userViber.id) {
        response.send(new TextMessage("Этот чат только для служебных целей."));
      }
});

// обработка нового клиента при его подключении к серверу
wsServer.on('connection', onConnect);


function onConnect(wsClient, req) {
  // добавление клиента в очередь и вывод сообщения в консоль
  const currentHours = new Date;
  const currentHoursUser = currentHours.getUTCHours() + +process.env.OFFSET_UTC;


  if (currentHoursUser < +process.env.MIN_HOURS_WORK || currentHoursUser > +process.env.MAX_HOURS_WORK) {
    let messageOutput = new Message("serverMessage", `Время работы чата с ${process.env.MIN_HOURS_WORK} по ${process.env.MAX_HOURS_WORK}.`);
    let messageOutputJson = JSON.stringify(messageOutput);
    wsClient.send(messageOutputJson);
    wsClient.close(1000, "non-working hours");
  }
  else if (clients.length > process.env.MAX_CLIENTS) {
    let messageOutput = new Message("serverMessage", "Очень много клиентов в очереди. Попробуйте позже.");
    let messageOutputJson = JSON.stringify(messageOutput);
    wsClient.send(messageOutputJson);
    wsClient.close(1000, "many clients");
  } else {
    clients.push(wsClient);
    const id = req.headers['sec-websocket-key'].toString();
    console.log('Client with id ' + colors.green(`${id}`) + ' connected');
    console.log(clients.length);

    // удаление клиента из очереди и отправка уведомления в консоль
    wsClient.on('close', function () {
      clients.splice(clients.indexOf(wsClient), 1);
      console.log('Client with id ' + colors.green(`${id}`) + ' disconnected');
      console.log(clients.length);
    });

    wsClient.on('message', function () {
      if (wsClient != activeWsClient) {
        let messageOutput = new Message("serverMessage", "Пожалуйста, ожидайте.");
        let messageOutputJson = JSON.stringify(messageOutput);
        wsClient.send(messageOutputJson);
      }
    });

    // отправка сообщения о добавлении в очередь новому клиенту при подключении к серверу
    if (clients.length > 1) {

      let messageOutput = new Message("serverMessage", "Здравствуйте, Вы были добавлены в очередь, как только освободится оператор, мы сообщим Вам.");
      let messageOutputJson = JSON.stringify(messageOutput);
      wsClient.send(messageOutputJson);
    }

    // логика обработки очереди клиентов
    if (clients.length == 1) {
      activeWsClient = wsClient;
      //console.log('Active client with id ' + colors.yellow(`${id}`) + ' connected');
      // отправка первого сообщения текущему клиенту    
      let messageOutput = new Message("userMessage", `Здравствуйте, я ${userViber.name}. Чем могу помочь?`, `${userViber.name}`, "addMessagesStandart");
      messageOutput.userAvatar = userViber.avatar;
      let messageOutputJson = JSON.stringify(messageOutput);
      activeWsClient.send(messageOutputJson);

      // установка текущему клиенту обработчика события отключения и назначение текущим клиентом следующего в очереди
      j(activeWsClient);

      // установка текущему клиенту обработчика события поступления нового сообщения и отправка их пользователю viber
      onMessage(activeWsClient);


      // объявление функции - установка текущему клиенту обработчика события отключения и назначение текущим клиентом следующего в очереди
      function j(client) {
        client.on('close', function () {
          //console.log('Active client with id ' + colors.yellow(`${id}`) + ' disconnected');
          console.log(clients.length);

          // отправка уведомления пользователю viber об отключении текущего клиента
          bot.sendMessage(userViber, new TextMessage("Клиент отключился"))
            .catch(console.error);

          // назначение текущим клиентом следующего в очереди при наличии
          if (clients.length > 0) {
            activeWsClient = clients[0];
            //console.log('Active client with id ' + colors.yellow(`${id}`) + ' connected');
            // отправка первого сообщения текущему клиенту
            let messageOutput = new Message("userMessage", `Здравствуйте, я ${userViber.name}. Чем могу помочь?`, `${userViber.name}`, "addMessagesStandart");
            messageOutput.userAvatar = userViber.avatar;
            let messageOutputJson = JSON.stringify(messageOutput);
            activeWsClient.send(messageOutputJson);

            // установка текущему клиенту обработчика события отключения и назначение текущим клиентом следующего в очереди
            j(activeWsClient);
            // установка текущему клиенту обработчика события поступления нового сообщения и отправка их пользователю viber
            onMessage(activeWsClient);

          } else {
            activeWsClient = null;
          }
        });
      }

      // объявление функции - установка текущему клиенту обработчика события поступления нового сообщения и отправка их пользователю viber
      function onMessage(client) {
        clearTimeout(timerActiveWsClient);
        timerActiveWsClient = setTimeout(() => {
          let messageOutput = new Message("serverMessage", "Время ожидания вышло. Ваш чат был отключен. Вы можете при необходимости подключиться снова.");
          let messageOutputJson = JSON.stringify(messageOutput);
          client.send(messageOutputJson);
          client.close(1000, "timeout");
        }, 180000);

        // отправка уведомления пользователю viber оподключении нового текущего клиента
        bot.sendMessage(userViber, new TextMessage("Подключился новый клиент"))
          .catch(console.error);

        // установка текущему клиенту обработчика события поступления нового сообщения и отправка их пользователю viber
        client.on('message', function (message) {
          clearTimeout(timerActiveWsClient);
          timerActiveWsClient = setTimeout(() => {
            let messageOutput = new Message("serverMessage", "Время ожидания вышло. Ваш чат был отключен. Вы можете при необходимости подключиться снова.");
            let messageOutputJson = JSON.stringify(messageOutput);
            client.send(messageOutputJson);
            client.close(1000, "timeout");
          }, 540000);

          let data = JSON.parse(message);
          const userBot = new ViberBot({
            authToken: process.env.VIBER_BOT_AUTHTOKEN,
            name: data.userName,
            avatar: "https://raw.githubusercontent.com/devrelv/drop/master/161-icon.png",
          });
          userBot.sendMessage(userViber, new TextMessage(data.messageContent))
            .then((() => {
              previousActiveWsClient = client;
            }))
            .catch((error => {
              console.log(error);
            }));
        });
      }


    }

  }
}


process.on('exit', () => {
  console.log("exit");
  let messageOutput = new Message("serverMessage", "Сервер выключен.");
  let messageOutputJson = JSON.stringify(messageOutput);
  clients.forEach((client) => client.send(messageOutputJson));
});

process.on('SIGINT', () => {
  console.log("sigint");
  process.exit();
});


app.use(express.static(path.join(__dirname, "public")));

let renderIndex = function (req, res) {
  res.sendFile(path.resolve(__dirname, 'public/index.html'));
};
app.get('/*', renderIndex);

app.use(bot.middleware());


const port = process.env.PORT || 3000;
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
  //   console.log(`Server listens http://localhost:${port}`);    
  // });

});

