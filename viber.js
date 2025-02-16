'use strict';

//common import
const colors = require("@colors/colors/safe");
const process = require("node:process");
require('dotenv').config();
const WebSocket = require('ws');

//viber import
const ViberBot = require('viber-bot').Bot;
const BotEvents = require('viber-bot').Events;
const TextMessage = require('viber-bot').Message.Text;



//создание профиля пользователя Viber (администратор)
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


class Message {
    userAvatar = "";
    constructor(type, messageContent, userName = '', actionOnMessage) {
        this.type = type;
        this.messageContent = messageContent;
        this.userName = userName;
        this.actionOnMessage = actionOnMessage;
    }
}


let activeWsClient;
let clients = [];
let timerActiveWsClient;
let previousActiveWsClient;



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
        console.log('Total number of clients: ' + clients.length);

        // удаление клиента из очереди и отправка уведомления в консоль
        wsClient.on('close', function () {
            clients.splice(clients.indexOf(wsClient), 1);
            console.log('Client with id ' + colors.green(`${id}`) + ' disconnected');
            console.log('Total number of clients: ' + clients.length);
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
            onCloseClient(activeWsClient);

            // установка текущему клиенту обработчика события поступления нового сообщения и отправка их пользователю viber
            onMessage(activeWsClient);

        }

    }
}

// объявление функции - установка клиенту обработчика события поступления нового сообщения и отправка их пользователю viber
function onMessage(client) {
    clearTimeout(timerActiveWsClient);
    timerActiveWsClient = setTimeout(() => {
        let messageOutput = new Message("serverMessage", "Время ожидания вышло. Ваш чат был отключен. Вы можете при необходимости подключиться снова.");
        let messageOutputJson = JSON.stringify(messageOutput);
        client.send(messageOutputJson);
        client.close(1000, "timeout");
    }, 180000);

    // отправка уведомления пользователю viber о подключении нового текущего клиента
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
            .then(() => {
                previousActiveWsClient = client;
            })
            .catch(error => {
                console.log(error);
            });
    });
}

// объявление функции - установка клиенту обработчика события отключения и назначение текущим клиентом следующего в очереди
function onCloseClient(client) {
    client.on('close', function () {

        // отправка уведомления пользователю viber об отключении текущего клиента
        bot.sendMessage(userViber, new TextMessage("Клиент отключился"))
            .catch(console.error);

        // назначение текущим клиентом следующего в очереди при наличии
        if (clients.length > 0) {
            activeWsClient = clients[0];
            // отправка первого сообщения текущему клиенту
            let messageOutput = new Message("userMessage", `Здравствуйте, я ${userViber.name}. Чем могу помочь?`, `${userViber.name}`, "addMessagesStandart");
            messageOutput.userAvatar = userViber.avatar;
            let messageOutputJson = JSON.stringify(messageOutput);
            activeWsClient.send(messageOutputJson);

            // установка текущему клиенту обработчика события отключения и назначение текущим клиентом следующего в очереди
            onCloseClient(activeWsClient);
            // установка текущему клиенту обработчика события поступления нового сообщения и отправка их пользователю viber
            onMessage(activeWsClient);

        } else {
            activeWsClient = null;
        }
    });
}


function createWebSocketServer(server) {
    const wsServer = new WebSocket.Server({ server });
    // обработка нового клиента при его подключении к ws-серверу
    wsServer.on('connection', onConnect);
}


// отправка сообщений от пользователя viber через бота клиенту 
bot.on(BotEvents.MESSAGE_RECEIVED, (messageViberInput, response) => {
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








//exports
exports.bot = bot;
exports.createWebSocketServer = createWebSocketServer;




