
export class Wid {

    workWidget() {


        // window.addEventListener('load', function () {


        const urlWebSocket = `${(window.location.protocol === "https:") ? "wss://" : "ws://"}${window.location.host}`; //ws://localhost:3000

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
        let errorEvent;
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
                fragment_messagesStandart.querySelector(".main_message_standart").addEventListener('click', function (e) {
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
            errorEvent = null;
            socket = new WebSocket(urlWebSocket);
            socket.onopen = onSocketOpen;
            socket.onmessage = onSocketMessage;
            socket.onclose = onSocketClose;
            socket.onerror = onSocketError;
        }

        function onSocketOpen(event) {
            document.getElementById("exit_dialog").style.display = "block";
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
            errorEvent = event;
            console.log('Ошибка соединения');
            document.getElementById("exit_dialog").style.display = "none";
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                console.log(`Ошибка соединения. Попытка повторного подключения ${reconnectAttempts + 1}`);
                setTimeout(() => tryToConnect(), 2000); // повторное подключение через 2 секунды
                reconnectAttempts++;
            } else {
                console.log('Ошибка соединения. Слишком много попыток соединения. Соединение невозможно, попробуйте позже');
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

        function onSocketClose(event) {
            if (!errorEvent) {
                console.log(`Код закрытия: ${event.code}`);
                document.getElementById("exit_dialog").style.display = "none";
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
                sendButton.classList.add("__disabled_sendButton");
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


        document.getElementById("exit_dialog").addEventListener('click', (e) => {
            e.preventDefault();
            socket.close(1000, "closed by user");
        });

        document.getElementById("start_dialogue_button").addEventListener('click', (e) => {
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
                document.getElementById("start_dialogue_button").classList.remove("start_dialogue_disabled");
                document.querySelector('.name_input').style.backgroundColor = "";

            } else {
                document.getElementById("start_dialogue_button").classList.add("start_dialogue_disabled");
                document.querySelector('.name_input').style.backgroundColor = "rgba(255, 11, 11, 0.09)";

            }
        });

        sendButton.addEventListener('click', function (e) {
            e.preventDefault();
            const message = new Message("userMessage", messageTextarea.value, userName);
            sendMessage(message);
        });

        messageTextarea.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const message = new Message("userMessage", e.target.value, userName);
                sendMessage(message);
            }
        });

        messageTextarea.addEventListener('input', function (e) {
            if (e.target.value === "") {
                sendButton.classList.add("__disabled_sendButton");
            } else {
                sendButton.classList.remove("__disabled_sendButton");
            }
        });

        document.getElementById('jivo_close_button').addEventListener('click', function () {
            jcont.classList.remove("jcont_show");
            jcont.classList.add("jcont_hidden");

            document.getElementById('labelWrap').classList.remove("labelWrap_hidden");
            document.getElementById('labelWrap').classList.add("labelWrap_show");

        });

        document.getElementById('instagram').addEventListener('click', function (e) {
            e.stopPropagation();
        });

        document.getElementById('jvlabelWrap').addEventListener('click', function () {
            jcont.classList.remove("jcont_hidden");
            jcont.classList.add("jcont_show");

            document.getElementById('labelWrap').classList.remove("labelWrap_show");
            document.getElementById('labelWrap').classList.add("labelWrap_hidden");
        });

        document.getElementById('substrate_header').addEventListener('mousedown', function (e) {
            if (window.innerWidth > 420) {
                document.getElementById('substrate_header').classList.add("wrap_substrate_active");
                document.querySelector('.scroll_message').style.display = "none";
                let mousePreviousPositionX = e.clientX;
                const widthWindow = document.documentElement.clientWidth;
                const distanceToRightJcont = - e.clientX - +window.getComputedStyle(jcont).getPropertyValue('--jright').replace(/[\D]/g, '') + widthWindow;
                const distanceToLeftJcont = e.clientX + 336 + +window.getComputedStyle(jcont).getPropertyValue('--jright').replace(/[\D]/g, '') - widthWindow;

                let mousePreviousPositionY = e.clientY;
                const heighthWindow = document.documentElement.clientHeight;
                const distanceToTopJcont = e.clientY + +window.getComputedStyle(jcont).getPropertyValue('--jheight').replace(/[\D]/g, '') - heighthWindow;


                document.addEventListener('mousemove', onMouseMoveY);
                document.addEventListener('mouseup', removeOnMouseMoveY);
                document.addEventListener('mousemove', onMouseMoveX);
                document.addEventListener('mouseup', removeOnMouseMoveX);

                function onMouseMoveY(e) {
                    const changedY = mousePreviousPositionY - e.clientY;
                    mousePreviousPositionY = e.clientY;
                    const currentJheight = +window.getComputedStyle(jcont).getPropertyValue('--jheight').replace(/[\D]/g, '');
                    const newJheight = currentJheight + changedY;

                    if ((distanceToTopJcont + 60 > e.clientY && currentJheight == (heighthWindow - 60)) || (currentJheight == 400 && e.clientY > heighthWindow - 400 + distanceToTopJcont)) { } else
                        if ((heighthWindow - 60) > newJheight && newJheight > 400) {
                            jcont.style.setProperty('--jheight', `${newJheight}px`);
                        } else if ((heighthWindow - 60) <= newJheight) {
                            jcont.style.setProperty('--jheight', `${heighthWindow - 60}px`);
                        } else if (400 >= newJheight) {
                            jcont.style.setProperty('--jheight', `${400}px`);
                        }
                }

                function onMouseMoveX(e) {
                    const changedX = mousePreviousPositionX - e.clientX;
                    mousePreviousPositionX = e.clientX;
                    const currentJright = +window.getComputedStyle(jcont).getPropertyValue('--jright').replace(/[\D]/g, '');
                    const newJright = currentJright + changedX;

                    if ((distanceToLeftJcont + 10 > e.clientX && currentJright == (widthWindow - 10 - 30 - 336)) || (currentJright == 30 && e.clientX > widthWindow - 30 - distanceToRightJcont)) { } else
                        if ((widthWindow - 10 - 30 - 336) > newJright && newJright > 30) {
                            jcont.style.setProperty('--jright', `${newJright}px`);
                        } else if ((widthWindow - 10 - 30 - 336) <= newJright) {
                            jcont.style.setProperty('--jright', `${widthWindow - 10 - 30 - 336}px`);
                        } else if (30 >= newJright) {
                            jcont.style.setProperty('--jright', `${30}px`);
                        }
                }

                function removeOnMouseMoveY() {
                    document.getElementById('substrate_header').classList.remove("wrap_substrate_active");
                    document.querySelector('.scroll_message').style.display = "block";
                    document.removeEventListener('mousemove', onMouseMoveY);
                }

                function removeOnMouseMoveX() {
                    document.removeEventListener('mousemove', onMouseMoveX);
                }
            }
        });


        // })

    }
}