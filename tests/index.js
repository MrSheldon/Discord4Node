const discord4node = require("discord4node");
const client = new discord4node({
    token: ""
})

let prefix = '-';

client.on('ready', () => {
    console.log('Bot is ready!')
})

client.on('message', (message) => {
    if (message.content.toLowerCase() === prefix + 'ping') {
        client.sendMessage(message.channel.id, "Pong!")
    } else if (message.content.toLowerCase() === prefix + 'serverinfo') {
        client.sendEmbed(message.channel.id, {
            title: "Server Information",
            thumbnail: {
                url: `https://cdn.discordapp.com/icons/${message.guild.id}/${message.guild.icon}.webp`
            },
            fields: [{
                    name: "ID",
                    value: message.guild.id,
                    inline: true
                },
                {
                    name: "Name",
                    value: message.guild.name,
                    inline: true
                },
                {
                    name: "Region",
                    value: message.guild.region,
                    inline: true
                },
                {
                    name: "Member Count",
                    value: message.guild.member_count + " Members",
                    inline: true
                }
            ]
        })
    }
})

client.login()