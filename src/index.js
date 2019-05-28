const EventEmitter = require('events');
const ws = require('ws');
const p = require('phin').promisified;
const request = require('request');

class Store extends Map {
    constructor(...args) {
        super(args);
    }

    map(callback) {
        let output = new Store();
        
        this.forEach((key, value) => {
            output.set(value, callback(key, value));
        });

        return output;
    }
}

class Discord4Node extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = options;
        this.guilds = new Store();
        this.users = new Store();
        this.channels = new Store();
        this.ws = {
            socket: null,
            connected: false,
            gateway: {
                url: null,
                obtainedAt: null,
                heartbeat: {
                    interval: null,
                    last: null,
                    recieved: false,
                    seq: null,
                }
            }
        };
        this.sessionId = null;
        this.user = null
    }

    async sendMessage(channelid, content) {
        if (!this.ws.connected) throw new Error(`Client isn't connected`);
        if (!channelid) throw new Error(`Please provide a channel ID`)
        if (!content) throw new Error(`Please provide a content for the message`)
        if (!this.channels.get(channelid)) throw new Error('Invalid channel')
        var body = {};
        body.content = content;
        var headers = {
            "content-type": "application/json",
            'Authorization': `Bot ${this.options.token}`,
        };
        request({
            uri: 'https://discordapp.com/api/channels/' + this.channels.get(channelid).id + '/messages',
            body: body,
            headers: headers,
            method: 'POST',
            json: true
        }, function(err, res, body) {
            if (err) throw new Error(err.message)
        });
    }

    async sendEmbed(channelid, content = {}) {
        if (!this.ws.connected) throw new Error(`Client isn't connected`);
        if (!channelid) throw new Error(`Please provide a channel ID`)
        if (!content) throw new Error(`Please provide a content for the embed`)
        if (!this.channels.get(channelid)) throw new Error('Invalid channel')
        var body = {};
        body.embed = content;
        var headers = {
            "content-type": "application/json",
            'Authorization': `Bot ${this.options.token}`,
        };
        request({
            uri: 'https://discordapp.com/api/channels/' + this.channels.get(channelid).id + '/messages',
            body: body,
            headers: headers,
            method: 'POST',
            json: true
        }, function(err, res, body) {
            if (err) throw new Error(err.message)
        });
    }

    async login() {
        if (this.ws.connected) throw new Error(`Client is already connected`);
        const b = await p({
            url: 'https://discordapp.com/api/gateway/bot',
            parse: 'json',
            headers: {
                'Authorization': `Bot ${this.options.token}`
            }
        });
        const gatewayURL = b.body.url;
        this.ws.gateway = {
            url: gatewayURL,
            obtainedAt: Date.now()
        };
        const socket = new ws(`${gatewayURL}/?v=7&encoding=json`);
        this.ws.socket = socket;
        socket.on('message', (incoming) => {
            const d = JSON.parse(incoming) || incoming;
            switch (d.op) {
                case 10:
                    this.ws.gateway.heartbeat = {
                        interval: d.d.heartbeat_interval,
                        last: null,
                        recieved: true
                    };
                    if (this.ws.gateway.heartbeat.recieved == false) throw new Error(`Last heartbeat hasn't been acknowledged, terminating connection`);
                    setInterval(() => {
                        this.ws.socket.send(JSON.stringify({
                            op: 1,
                            d: 0
                        }));
                        this.ws.gateway.heartbeat.recieved = false;
                    }, this.ws.gateway.heartbeat.interval);
                    socket.send(JSON.stringify({
                        op: 2,
                        d: {
                            token: this.options.token,
                            properties: {
                                $os: process.platform,
                                $browser: 'discord4node',
                                $device: 'discord4node',
                            },
                            compress: false,
                            large_threshold: 250,
                            presence: {
                                status: 'online',
                                afk: false,
                            }
                        }
                    }));
                    break;
                case 11:
                    this.ws.gateway.heartbeat.last = Date.now();
                    this.ws.gateway.heartbeat.recieved = true;
                    break;
                case 0:
                    let Events = {
                        'READY': 'ready',
                        'MESSAGE_CREATE': 'messge',
                        'GUILD_CREATE': 'guildCreate',
                    }
                    if (!Events.hasOwnProperty(d.t)) return;
                    if (d.t == 'READY') {
                        this.readyAt = Date.now();
                        this.sessionId = d.d.session_id;
                        this.user = d.d.user;
                        for (const [obj] in d.d.guilds) {
                            this.guilds.set(d.d.guilds[obj].id);
                        }
                        this.ws.connected = true;
                        this.emit('ready')
                    }
                    if (d.t == 'MESSAGE_CREATE') {
                        let msgObj = {
                            id: d.d.id,
                            guild: this.guilds.get(d.d.guild_id),
                            channel: this.channels.get(d.d.channel_id),
                            attachments: d.d.attachments,
                            embeds: d.d.embeds,
                            timestamp: d.d.timestamp,
                            edited_timestamp: d.d.edited_timestamp,
                            content: d.d.content,
                            tts: d.d.tts,
                            pinned: d.d.pinned,
                            mentions: d.d.mentions,
                            mention_roles: d.d.mention_roles,
                            mention_everyone: d.d.mention_everyone,
                            member: {
                                id: d.d.author.id,
                                nickname: d.d.member.nick,
                                joined_at: d.d.member.joined_at,
                                roles: d.d.member.roles,
                            },
                            author: {
                                id: d.d.author.id,
                                username: d.d.author.username,
                                discriminator: d.d.author.discriminator,
                                tag: d.d.author.username + "#" + d.d.author.discriminator,
                                avatar: d.d.author.avatar,
                            },
                        }
                        this.emit('message', msgObj)
                    }
                    if (d.t == 'GUILD_CREATE') {
                        var channels = new Store();
                        for (const channel of d.d.channels) {
                            channels.set(channel.id, channel);
                            this.channels.set(channel.id, channel);
                        }
                        var members = new Store();
                        for (const member of d.d.members) {
                            members.set(member.user.id, member.user);
                            this.users.set(member.user.id, member.user);
                        }
                    }
                    if (this.guilds.has(d.d.id)) {
                        d.d.channels = channels;
                        d.d.members = members;
                        this.guilds.set(d.d.id, d.d);
                        this.emit('guildAvailable', d.d);
                    } else {
                        this.guilds.set(d.d.id, d.d);
                        this.emit('guildCreate', d.d);
                    }
                    break;
            }
        });
    }
}

module.exports = Discord4Node;