
export class Wid {

    workWidget() {

        // window.addEventListener('load', function () {




        const messages = document.getElementById('messages');
        const sendButton = document.getElementById('sendButton');
        const messageTextarea = document.getElementById('message');
        const jcont = document.getElementById('jcont');
        const startDialogue = document.getElementById('start_dialogue');
        const soundNotification = document.getElementById('jivo-sound-notification');
        const soundOutgoingMessage = document.getElementById('jivo-sound-outgoing_message');
        const soundAgentMmessage = document.getElementById('jivo-sound-agent_message');



        let socket;
        let reconnectAttempts = 0;
        const MAX_RECONNECT_ATTEMPTS = 2;
        let userName = "";


        class Message {
            userAvatar = "";
            constructor(type, messageContent, userName = '', actionOnMessage) {
                this.type = type;
                this.messageContent = messageContent;
                this.userName = userName;
                this.actionOnMessage = actionOnMessage;
            }
        }

        const actionOnMessage = {
            addMessagesStandart: function () {
                let fragment_messagesStandart = document.getElementById('template_messagesStandart').content.cloneNode(true);
                fragment_messagesStandart.querySelector(".main_message_standart").addEventListener('touchend', function (e) {
                    e.preventDefault();
                    if (e.target.classList.contains("button_message_standart")) {
                        sendMessage(new Message("userMessage", e.target.textContent, userName));
                    }
                });
                messages.append(fragment_messagesStandart);
                messages.scrollIntoView({ behavior: "smooth", block: "end" });
            }
        }


        function tryToConnect() {
            socket = new WebSocket("ws://localhost:3000");
            socket.onopen = onSocketOpen;
            socket.onmessage = onSocketMessage;
            socket.onclose = onSocketClose;
            socket.onerror = onSocketError;
        }

        function onSocketOpen(event) {
            document.querySelector(".wrap_a482").style.display = "block";
            console.log('Успешное соединение');
            reconnectAttempts = 0;
        }

        function onSocketMessage(event) {
            const message = JSON.parse(event.data);
            acceptMessage(message);
            try {
                if (message.actionOnMessage) {
                    actionOnMessage[message.actionOnMessage]();
                }
            } catch (error) {
                console.error("Функция не определена: " + error);
            }
        }

        function onSocketError(event) {
            console.log('Ошибка соединения');
            socket.close();
        }

        function onSocketClose(event) {
            console.log(`Код закрытия: ${event.code}`);
            document.querySelector(".wrap_a482").style.display = "none";
            if (event.reason === "closed by user" || event.reason === "many clients" || event.reason === "non-working hours" || event.reason === "timeout") {
                messages.appendChild(startDialogue);
                startDialogue.style.setProperty('display', 'block');
                messages.scrollIntoView({ behavior: "smooth", block: "end" });
            } else if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                console.log(`Соединение закрыто. Попытка повторного подключения ${reconnectAttempts + 1}`);
                setTimeout(() => tryToConnect(), 2000); // повторное подключение через 2 секунды
                reconnectAttempts++;
            } else {
                console.log('Соединение закрыто. Слишком много попыток соединения. Соединение невозможно, попробуйте позже');
                acceptMessage(
                    new Message("serverMessage", "Сервер не отвечает. Соединение невозможно, попробуйте начать новый диалог позже.",)
                );
                setTimeout(() => {
                    //reconnectAttempts = 0;
                    messages.appendChild(startDialogue);
                    startDialogue.style.setProperty('display', 'block');
                    messages.scrollIntoView({ behavior: "smooth", block: "end" });
                }, 2000);
            }
        }

        function sendMessage(message) {
            if (message.messageContent !== "" && socket?.readyState === 1 && socket?.bufferedAmount === 0) {
                socket.send(JSON.stringify(message));
                let fragment_messageOutput = document.getElementById('template_messageOutput').content.cloneNode(true);
                const newContent = document.createTextNode(message.messageContent);
                const timeNow = new Date;
                const timeNewContent = document.createTextNode(`${timeNow.getHours()}` + ":" + `${timeNow.getMinutes()}`);


                fragment_messageOutput.querySelector('.textWrap_messageOutput').prepend(newContent);
                fragment_messageOutput.querySelector('.time').append(timeNewContent);
                messages.append(fragment_messageOutput);
                soundOutgoingMessage.play();
                messages.scrollIntoView({ behavior: "smooth", block: "end" });
                messageTextarea.value = "";
                sendButton.classList.add("__disabled_f743");
            }
        }

        function acceptMessage(message) {
            if (message.messageContent !== "" && message.type === "userMessage") {
                let fragment_messageInput = document.getElementById('template_messageInput').content.cloneNode(true);
                const newContent = document.createTextNode(message.messageContent);
                const agentName = document.createTextNode(message.userName);
                const timeNow = new Date;
                const timeNewContent = document.createTextNode(`${timeNow.getHours()}` + ":" + `${timeNow.getMinutes()}`);


                if (message.userAvatar) {
                    fragment_messageInput.querySelector('.avatarImg_messageInput').style.setProperty('background-image', `url(${message.userAvatar})`);
                }


                fragment_messageInput.querySelector('.text_messageInput').prepend(newContent);
                fragment_messageInput.querySelector('.time').append(timeNewContent);
                fragment_messageInput.querySelector('.agentName_messageInput').append(agentName);
                messages.append(fragment_messageInput);
                soundAgentMmessage.play();
                messages.scrollIntoView({ behavior: "smooth", block: "end" });
            } else
                if (message.messageInput !== "" && message.type === "serverMessage") {
                    let fragment_messageInput = document.getElementById('template_messageServer').content.cloneNode(true);
                    const newContent = document.createTextNode(message.messageContent);
                    const timeNow = new Date;
                    const timeNewContent = document.createTextNode(`${timeNow.getHours()}` + ":" + `${timeNow.getMinutes()}`);


                    fragment_messageInput.querySelector('.textWrap_messageOutput').prepend(newContent);
                    fragment_messageInput.querySelector('.time').append(timeNewContent);

                    messages.append(fragment_messageInput);
                    soundAgentMmessage.play();
                    messages.scrollIntoView({ behavior: "smooth", block: "end" });
                }
        }


        document.getElementById("exit_dialog").addEventListener('touchend', (e) => {
            e.preventDefault();
            socket.close(1000, "closed by user");
        });

        document.getElementById("start_dialogue_button").addEventListener('touchend', (e) => {
            e.preventDefault();
            if (document.getElementById("name_user").validity.valid) {
                startDialogue.style.setProperty('display', 'none');
                tryToConnect();
            }
        });

        document.getElementById("name_user").addEventListener('input', (e) => {
            e.preventDefault();
            userName = e.target.value;
        });

        document.getElementById("name_user").addEventListener('input', (e) => {
            if (e.target.validity.valid) {
                document.getElementById("start_dialogue_button").classList.remove("disabled");
                document.getElementById("name_user").style.border = "";;

            } else {
                document.getElementById("start_dialogue_button").classList.add("disabled");
                document.getElementById("name_user").style.border = "1px solid red";

            }
        });

        sendButton.addEventListener('touchend', function (e) {
            e.preventDefault();
            const message = new Message("userMessage", messageTextarea.value, userName);
            sendMessage(message);
        });



        messageTextarea.addEventListener('input', function (e) {
            if (e.target.value === "") {
                sendButton.classList.add("__disabled_f743");
            } else {
                sendButton.classList.remove("__disabled_f743");
            }
        });


        document.getElementById('alert_close_dialog_show').addEventListener('touchend', function () {
            document.getElementById('alert_close_dialog').classList.add("wrapper_e942_show");
        });

        document.getElementById('exit_dialog').addEventListener('touchend', function () {
            document.getElementById('alert_close_dialog').classList.remove("wrapper_e942_show");
        });

        document.getElementById('exit_dialog_cancel').addEventListener('touchend', function () {
            document.getElementById('alert_close_dialog').classList.remove("wrapper_e942_show");
        });

        document.querySelector('.main_dc1e_close_dialog').addEventListener('touchend', function () {
            document.getElementById('alert_close_dialog').classList.remove("wrapper_e942_show");

        });

        document.getElementById('jivo_close_button').addEventListener('touchend', function () {
            document.body.classList.remove("hidden_scroll");
            jcont.classList.remove("mobileContainer_show");
            jcont.classList.add("mobileContainer_hidden");
            document.getElementById('labelWrap').classList.remove("_hidden_fe37");

        });

        document.getElementById('chat_open').addEventListener('touchend', function () {
            document.body.classList.add("hidden_scroll");
            jcont.classList.remove("mobileContainer_hidden");
            jcont.classList.add("mobileContainer_show");
            document.getElementById('menuWrapper').classList.remove("wrapper_e942_show");
        });

        document.getElementById('chat_cancel').addEventListener('touchend', function () {
            document.getElementById('labelWrap').classList.remove("_hidden_fe37");
            document.getElementById('menuWrapper').classList.remove("wrapper_e942_show");
        });

        document.querySelector('.main_dc1e').addEventListener('touchend', function () {
            document.getElementById('labelWrap').classList.remove("_hidden_fe37");
            document.getElementById('menuWrapper').classList.remove("wrapper_e942_show");
        });

        document.getElementById('labelWrap').addEventListener('touchend', function () {
            console.log("touchend_label");
            document.getElementById('labelWrap').classList.add("_hidden_fe37");
            document.getElementById('menuWrapper').classList.add("wrapper_e942_show");
        });




        // })

    }
}