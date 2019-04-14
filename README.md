[![NPM](https://nodei.co/npm/discord4node.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/discord4node/)

# STILL IN DEVELOPMENT

## Getting Started
Simply run `npm i discord4node` (or `yarn add discord4node`)

## Usage 

**Create Client**
```javascript
const discord4node = require("discord4node");
const client = new discord4node({
    token: ""
})

client.login()
```

**Event: ready**
```javascript
client.on('ready', () => {})
```

**Event: message**
```javascript
client.on('message', (message) => {})
```

**Function: send message**
```javascript
client.sendMessage(channelid, string)
```

**Function: send embed message**
```javascript
client.sendEmbed(channelid, embedObject)
```

See working example [here](https://github.com/MrSheldon/Discord4Node/blob/master/tests/index.js)

You can find the embed object [here](https://discordapp.com/developers/docs/resources/channel#embed-object)
