class Message {
    constructor(type, messageContent, userName = '', actionOnMessage) {
        this.type = type;
        this.messageContent = messageContent;
        this.userName = userName;
        this.actionOnMessage = actionOnMessage;
    }
}