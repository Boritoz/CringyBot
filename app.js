/*
         © Copyright Adam Aharony (a.k.a. Cringy Adam)
                    All rights reserved
       Twitter: @AdamAharony, Discord: @Cringy Adam#4611
*/

var errorlog = require("./data/errors.json");

const Discord = require("discord.js");
const started = Date();

try {
    var config = require('./config.json');
    console.log("Config file detected!");
} catch (err) {
    console.log(err);
    console.log("No config detected, attempting to use environment variables...");
    if (process.env.MUSIC_BOT_TOKEN && process.env.YOUTUBE_API_KEY) {
        var config = {
            "token": process.env.MUSIC_BOT_TOKEN,
            "client_id": "241966505334407168",
            "prefix": ".",
            "owner_id": "171319044715053057",
            "youtube_api_key": process.env.YOUTUBE_API_KEY,
            "admins": []
        }
    } else {
        console.log("No token passed! Exiting...")
        process.exit(0)
    }
}
const admins = config.admins;
const bot = new Discord.Client()
const notes = require('./data/notes.json')
const os = require('os')
const prefix = config.prefix;
const rb = "```"
const sbl = require("./data/blservers.json")
const ubl = require("./data/blusers.json")
const fs = require("fs")
const warns = require("./data/warns.json")
const queues = {}
const ytdl = require('ytdl-core')
const search = require('youtube-search')
const opts = {
    part: 'snippet',
    maxResults: 10,
    key: config.youtube_api_key
}
var intent;

function getQueue(guild) {
    if (!guild) return
    if (typeof guild == 'object') guild = guild.id
    if (queues[guild]) return queues[guild]
    else queues[guild] = []
    return queues[guild]
}

function getRandomInt(max) {
    return Math.floor(Math.random() * (max + 1));
}

var paused = {}

//Fix dis shit
function getRandomMusic(queue, msg) {
    fs.readFile('./data/autoplaylist.txt', 'utf8', function(err, data) {
        if (err) throw err;
        console.log('OK: autoplaylist.txt');
        var random = data.split('\n');

        var num = getRandomInt(random.length);
        console.log(random[num])
        var url = random[num];
        msg.author.username = "AUTOPLAYLIST";
        play(msg, queue, url)
    });
}

function play(msg, queue, song) {
    try {
        if (!msg || !queue) return;
        //if (msg.guild.voiceConnection.channel.members.first() == undefined)
        if (song) {
            search(song, opts, function(err, results) {
                if (err) return msg.channel.sendMessage("Video not found please try to use a youtube link instead.");
                song = (song.includes("https://" || "http://")) ? song : results[0].link
                let stream = ytdl(song, {
                    audioonly: true
                })
                let test
                if (queue.length === 0) test = true
                queue.push({
                    "title": results[0].title,
                    "requested": msg.author.username,
                    "toplay": stream
                })
                console.log("Queued " + queue[queue.length - 1].title + " in " + msg.guild.name + " as requested by " + queue[queue.length - 1].requested)
                msg.channel.sendMessage("Queued **" + queue[queue.length - 1].title + "**")
                if (test) {
                    setTimeout(function() {
                        play(msg, queue)
                    }, 1000)
                }
            })
        } else if (queue.length != 0) {
            msg.channel.sendMessage(`Now Playing **${queue[0].title}** | Requested by ***${queue[0].requested}***`)
            console.log(`Playing ${queue[0].title} as requested by ${queue[0].requested} in ${msg.guild.name}`);
            bot.user.setGame(queue[0].title);
            let connection = msg.guild.voiceConnection
            if (!connection) return console.log("No Connection!");
            intent = connection.playStream(queue[0].toplay)

            intent.on('error', () => {
                queue.shift()
                play(msg, queue)
            })

            intent.on('end', () => {
                queue.shift()
                play(msg, queue)
            })
        } else {
            msg.channel.sendMessage('No more music in queue! Starting autoplaylist')


            //TODO: When no more music, play randomly from playlist

            getRandomMusic(queue, msg);


        }
    } catch (err) {
        console.log("WELL LADS LOOKS LIKE SOMETHING WENT WRONG! This is the error code:\n\n\n" + err.stack)
        errorlog[String(Object.keys(errorlog).length)] = {
            "code": err.code,
            "error": err,
            "stack": err.stack
        }
        fs.writeFile("./data/errors.json", JSON.stringify(errorlog), function(err) {
            if (err) return console.log("Even worse we couldn't write to our error log file! Make sure data/errors.json still exists!");
        })

    }
}

function secondsToString(seconds) {
    try {
        var numyears = Math.floor(seconds / 31536000);
        var numdays = Math.floor((seconds % 31536000) / 86400);
        var numhours = Math.floor(((seconds % 31536000) % 86400) / 3600);
        var numminutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
        var numseconds = Math.round((((seconds % 31536000) % 86400) % 3600) % 60);

        var str = "";
        if (numyears > 0) {
            str += numyears + " year" + (numyears == 1 ? "" : "s") + " ";
        }
        if (numdays > 0) {
            str += numdays + " day" + (numdays == 1 ? "" : "s") + " ";
        }
        if (numhours > 0) {
            str += numhours + " hour" + (numhours == 1 ? "" : "s") + " ";
        }
        if (numminutes > 0) {
            str += numminutes + " minute" + (numminutes == 1 ? "" : "s") + " ";
        }
        if (numseconds > 0) {
            str += numseconds + " second" + (numseconds == 1 ? "" : "s") + " ";
        }
        return str;
    } catch (err) {
        console.log("Could not get time")
        return 'Could not get time';
    }
}

function isCommander(id) {
	if(id === config.owner_id) {
		return true;
	}
	for(var i = 0; i < admins.length; i++){
		if(admins[i] == id) {
			return true;
		}
	}
	return false;
}

bot.on('ready', function() {
    try {
        config.client_id = bot.user.id;
        bot.user.setStatus('online', config.status)
        var msg = `
------------------------------------------------------
> Logging in...
------------------------------------------------------
Logged in as ${bot.user.username}#${bot.user.discriminator}
On ${bot.guilds.size} servers!
${bot.channels.size} channels and ${bot.users.size} users cached!
I am logged in and ready to roll!
LET'S GO!
------------------------------------------------------`

        console.log(msg)
        var errsize = Number(fs.statSync("./data/errors.json")["size"])
        console.log("Current error log size is " + errsize + " Bytes")
        if (errsize > 5000) {
            errorlog = {}
            fs.writeFile("./data/errors.json", JSON.stringify(errorlog), function(err) {
                if (err) return console.log("Uh oh we couldn't wipe the error log");
                console.log("Just to say, we have wiped the error log on your system as its size was too large")
            })
        }
        console.log("------------------------------------------------------")
    } catch (err) {
        console.log("WELL LADS LOOKS LIKE SOMETHING WENT WRONG! This is the error code:\n\n\n" + err.stack)
        errorlog[String(Object.keys(errorlog).length)] = {
            "code": err.code,
            "error": err,
            "stack": err.stack
        }
        fs.writeFile("./data/errors.json", JSON.stringify(errorlog), function(err) {
            if (err) return console.log("Even worse we couldn't write to our error log file! Make sure data/errors.json still exists!");
        })

    }
})

bot.on('voiceStateUpdate', function(oldMember, newMember) {
	var svr = bot.guilds.array()
    for (var i = 0; i < svr.length; i++) {
        if (svr[i].voiceConnection) {
            if (paused[svr[i].voiceConnection.channel.id]) {
                if (svr[i].voiceConnection.channel.members.size > 1) {
                    //svr[i].defaultChannel.sendMessage("I resumed my music in " + svr[i].voiceConnection.channel.name)
					paused[svr[i].voiceConnection.channel.id].player.resume()
					var game = bot.user.presence.game.name;
                    delete paused[svr[i].voiceConnection.channel.id]
                    game = game.split("⏸")[1];
					bot.user.setGame(game);
                }
            }
            if (svr[i].voiceConnection.channel.members.size === 1 && !svr[i].voiceConnection.player.dispatcher.paused) {
                //svr[i].defaultChannel.sendMessage("I paused my music in the voice channel because no one is there, rejoin the channel to resume music")
                svr[i].voiceConnection.player.dispatcher.pause();
                var game = bot.user.presence.game.name;
                paused[svr[i].voiceConnection.channel.id] = {
                    "player": svr[i].voiceConnection.player.dispatcher
                }
                bot.user.setGame("⏸ " + game);
            }
        }
    }
});

bot.on("message", function(message) {
    try {
        if (message.author.bot) return
		if (message.channel.type === "dm") return;
        if (message.author === bot.user)
            if (message.guild === undefined) {
                message.channel.sendMessage("",{
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Sorry lad, not now..',
                    description: 'The bot only works in servers!',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                })

                return;
            }
        if (sbl.indexOf(message.guild.id) != -1 && message.content.startsWith(prefix)) {
            message.channel.sendMessage("", {
              embed: {
                author: {
                  name: bot.user.username
                },
                title: 'Blacklisted server!',
                description: 'This server is blacklisted!',
                color: 0x008AF3,
                timestamp: new Date(),
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: bot.user.avatarURL
                }
              }
            })
            return
        }
        if (ubl.indexOf(message.author.id) != -1 && message.content.startsWith(prefix)) {
            message.reply(" you are blacklisted and can\'t use the bot!")
            return
        }
        if (message.content.startsWith(prefix + "ping")) {
            var before = Date.now()
            message.channel.sendMessage("Pong!").then(function(msg) {
                var after = Date.now()
                msg.edit("Pong! **" + (after - before) + "**ms")

            })
        }

        if (message.content.startsWith(prefix + 'sendmsg')) {
          var args = message.content.split(/[ ]+/);
          let reason = args.slice(2).join(" ");
          if(message.author.id !== config.owner_id) return;
          if (message.content.split(" ")[1] === undefined) {
            message.reply("Please insert a channel ID.");
            return;
          }
          if (bot.channels.get(message.content.split(" ")[1]) === undefined) {
            message.reply("Not a valid channel ID.");
            return;
          }
          if(reason.length < 1) return;
          message.delete();
          bot.channels.get(message.content.split(" ")[1]).sendMessage(reason);

        }

        if (message.content.startsWith(prefix + 'help')) {
            message.channel.sendMessage("Check your DM's **" + message.author.username + "**")
            message.author.sendMessage('', {
              embed: {
                author: {
                  name: bot.user.username
                },
                title: 'Bot help:',
                color: 0x008AF3,
                description : `
    **${prefix}help** - Shows this message.\n
    **${prefix}ping** - Ping/Pong with ms amount.\n
    **${prefix}servers** Shows amount of servers.\n
    **${prefix}play** - Plays the song you requested.\n
    **${prefix}voteskip** - You may vote to skip a song.\n
    **${prefix}volume** <volume> - Change the volume.\n
    **${prefix}queue** - Check the list of songs that are queued.\n
    **${prefix}np/nowplaying** - Check the current song out.\n
    **${prefix}skip** - Skips the playing song.\n
    **${prefix}pause** - Pause the current song.\n
    **${prefix}deletewarn** <user> - Deletes a warning from a user.\n
    **${prefix}lookupwarn** <user> - Lookup warning information on a user.\n
    **${prefix}eval** - Owner only.\n
    **${prefix}clearqueue** - Clears the list of queues.\n
    **${prefix}say** - Admin only.\n
    **${prefix}sendmsg** <channel_ID> <message_text> - Owner only. Sends a message to a channel.\n
    **${prefix}resume** - Resumes paused song.\n
    **${prefix}about** - Info about the bot.\n
    **${prefix}kick** - Admin only. Kicks a user.\n
    **${prefix}nick** - Changes the bot's Nickname.\n
    **${prefix}google** <stuff_to_search> - Searches Google.\n
    **${prefix}shutdown** - Power off the bot (Owner only).\n
    **${prefix}invite** - Creates OAuth URL for bot.\n
    **${prefix}github** - Sends link to github repo.\n
    **${prefix}play** - Plays a link that you have wanted it to.\n
    **${prefix}userblacklist** <add/remove> <user id> - Blacklists a user.\n
    **${prefix}warn** <user> <reason> - Warns a user for the thing they did wrong.\n
    **${prefix}reminder** <time>|<reminder> - Reminds you of something in a certain time.\n
    **${prefix}serverblacklist** <add/remove> <server id> - Adds or removes servers from blacklist.\n
    **${prefix}note** - Takes a note.\n
    **${prefix}mynotes** - Shows notes you have taken.\n
    **${prefix}math** <maths> - evaluates math equations.\n
    **${prefix}uptime** - Shows bot uptime.\n
    **${prefix}sys** - Gets system information.`
              }
            })
        }
        if (message.content.startsWith(prefix + 'servers')) {
            message.channel.sendMessage("", {
              embed: {
                author: {
                  name: bot.user.username
                },
                title: 'Server count!',
                description: `I am currently on ${bot.guilds.size} server(s).`,
                color: 0x008AF3,
                timestamp: new Date(),
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: bot.user.avatarURL
                }
              }
            })
        }
        if (message.content === prefix + 'uptime') {
            message.channel.sendMessage("secondsToString(process.uptime())", {
              embed: {
                author: {
                  name: bot.user.username
                },
                title: 'Uptime',
                description: `I have been up for ${secondsToString(process.uptime())} - My process was started at ${started}`,
                color: 0x008AF3,
                timestamp: new Date(),
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: bot.user.avatarURL
                }
              }
            })
        }

        if (message.content.startsWith(prefix + 'play')) {
            if (!message.guild.voiceConnection) {
                if (!message.member.voiceChannel) return message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Join a voice channel first!',
                    description: 'You need to be in a voice channel.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                })
                var chan = message.member.voiceChannel
                chan.join()
            }
            let suffix = message.content.split(" ").slice(1).join(" ")
            if (!suffix) return message.channel.sendMessage('', {
              embed: {
                author: {
                  name: bot.user.username
                },
                title: 'Specify a song',
                description: 'You need t specify a song name or a link.',
                color: 0x008AF3,
                timestamp: new Date(),
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: bot.user.avatarURL
                }
              }
            })

            play(message, getQueue(message.guild.id), suffix);
        }

        if (message.content.startsWith(prefix + 'sys')) {
            message.channel.sendMessage(`${rb}xl\nSystem info: ${process.platform} - ${process.arch} with ${process.release.name} version ${process.version.slice(1)}\nProcess info: PID ${process.pid} at ${process.cwd()}\nProcess memory usage:${Math.ceil(process.memoryUsage().heapTotal / 1000000)}MB\nSystem memory usage: ${Math.ceil((os.totalmem() - os.freemem()) / 1000000)} of ${Math.ceil(os.totalmem() / 1000000)}MB\nBot info: ID ${bot.user.id}#${bot.user.discriminator}\n${rb}`);
        }
        if (message.content.startsWith(prefix + "serverblacklist")) {
            if (message.author.id === config.owner_id || config.admins.indexOf(message.author.id) != -1) {
                let c = message.content.split(" ").splice(1).join(" ")
                let args = c.split(" ")
                console.log("[DEVELOPER DEBUG] Blacklist args were: " + args)
                if (args[0] === "remove") {
                    sbl.splice(sbl.indexOf(args[1]))
                    fs.writeFile("./data/blservers.json", JSON.stringify(sbl))
                } else if (args[0] === "add") {
                    sbl.push(args[1])
                    fs.writeFile("./data/blservers.json", JSON.stringify(sbl))
                } else {
                    message.channel.sendMessage('', {
                      embed: {
                        author: {
                          name: bot.user.username
                        },
                        title: 'No args',
                        description: `You need to specify what to do! ${prefix}serverblacklist <add/remove> <server id>`,
                        color: 0x008AF3,
                        timestamp: new Date(),
                        footer: {
                          text: 'CringyBot Normal edition',
                          icon_url: bot.user.avatarURL
                        }
                      }
                    })
                }
            } else {
                message.channel.sendMessage("", {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Owner only!',
                    description: 'Sorry, this command is for the owner only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                })
            }

        }
        if (message.content.startsWith(prefix + 'note')) {
            if (notes[message.author.id] === undefined) {
                notes[message.author.id] = {
                    'notes': []
                }
            }
            notes[message.author.id].notes[notes[message.author.id].notes.length] = {
                'content': message.cleanContent.split(" ").splice(1).join(" "),
                'time': Date()
            }
            fs.writeFile('./data/notes.json', JSON.stringify(notes), function(err) {
                if (err) return;
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Added to notes',
                    description: `Type **${prefix}mynotes** to see all your notes.`,
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                })
            })
        }
        if (message.content === prefix + 'mynotes') {
            var nutes = 'Here are your notes:\n\n```'
            for (var i = 0; i < notes[message.author.id].notes.length; i++) {
                nutes += `${i + 1}) '${notes[message.author.id].notes[i].content}' - Added ${notes[message.author.id].notes[i].time}\n`
            }

            nutes += "```"
            message.channel.sendMessage(nutes)
        }

        if (message.content.startsWith(prefix + "userblacklist")) {
            if (message.author.id === config.owner_id || config.admins.indexOf(message.author.id) != -1) {
                let c = message.content.split(" ").splice(1).join(" ")
                let args = c.split(" ")
                console.log("[DEVELOPER DEBUG] Blacklist args were: " + args)
                if (args[0] === "remove") {
                    ubl.splice(ubl.indexOf(args[1]))
                    fs.writeFile("./data/blusers.json", JSON.stringify(ubl))
                } else if (args[0] === "add") {
                    ubl.push(args[1])
                    fs.writeFile("./data/blusers.json", JSON.stringify(sbl))
                } else {
                    message.channel.sendMessage(`You need to specify what to do! ${prefix}userblacklist <add/remove> <server id>`, {
                      embed: {
                        author: {
                          name: bot.user.username
                        },
                        title: 'Specify what to do!',
                        description: `Do ${prefix}userblacklist <add/remove> <server id>`,
                        color: 0x008AF3,
                        timestamp: new Date(),
                        footer: {
                          text: 'CringyBot Normal edition',
                          icon_url: bot.user.avatarURL
                        }
                      }
                    })
                }
            } else {
                message.channel.sendMessage("",{
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Owner only!',
                    description: 'Sorry, this command is for the owner only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                })
            }

        }

        if (message.content.startsWith(prefix + "clear")) {
            if (message.guild.owner.id == message.author.id || message.author.id == config.owner_id || config.admins.indexOf(message.author.id) != -1 || message.channel.permissionsFor(message.member).hasPermission('MANAGE_SERVER')) {
                let queue = getQueue(message.guild.id);
                if (queue.length == 0) return message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'No music!',
                    description: 'No music in queue',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                });
                for (var i = queue.length - 1; i >= 0; i--) {
                    queue.splice(i, 1);
                }
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Queue cleared!',
                    description: 'Cleared the queue.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                })
            } else {
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Admin only!',
                    description: 'Sorry, this command is for the admins only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                });
            }
        }

        if (message.content.startsWith(prefix + "lookupwarn")) {
            if (message.guild.owner.id == message.author.id || message.author.id == config.owner_id || config.admins.indexOf(message.author.id) != -1 || message.channel.permissionsFor(message.member).hasPermission('MANAGE_SERVER')) {
                let user = message.mentions.users.array()[0];
                if (!user) return message.channel.sendMessage("You need to mention the user");
                let list = Object.keys(warns);
                let found = '';
                let foundCounter = 0;
                let warnCase;
                //looking for the case id
                for (let i = 0; i < list.length; i++) {
                    if (warns[list[i]].user.id == user.id) {
                        foundCounter++;
                        found += `${(foundCounter)}. Username: ${warns[list[i]].user.name}\nAdmin: ${warns[list[i]].admin.name}\nServer: ${warns[list[i]].server.name}\nReason: ${warns[list[i]].reason}\n`;
                    }
                }
                if (foundCounter == 0) return message.channel.sendMessage("No warns recorded for that user")
                message.channel.sendMessage(`Found ${foundCounter} warns\n ${found}`);
            } else {
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Owner only!',
                    description: 'Sorry, this command is for the owner only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                });
            }
        }

        if (message.content.startsWith(prefix + 'skip')) {
            if (message.guild.owner.id == message.author.id || message.author.id == config.owner_id || config.admins.indexOf(message.author.id) != -1 || message.channel.permissionsFor(message.member).hasPermission('MANAGE_SERVER')) {
                let player = message.guild.voiceConnection.player.dispatcher
                if (!player || player.paused) return message.channel.sendMessage("", {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Not playing!',
                    color: 0x008AF3,
                    description: 'I am currently not playing.',
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                })
                message.channel.sendMessage('Skipping song...', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Skipping...',
                    color: 0x008AF3,
                    description: 'Skipping song...',
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                });
                player.end()
            } else {
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Admin only!',
                    description: 'Sorry, this command is for the admins only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                });
            }
        }

        if (message.content.startsWith(prefix + "deletewarn")) {
            if (message.channel.permissionsFor(message.member).hasPermission("KICK_MEMBERS") || message.channel.permissionsFor(message.member).hasPermission("BAN_MEMBERS") || message.guild.owner.id == message.author.id || message.author.id == config.owner_id || config.admins.indexOf(message.author.id) != -1) {
                let user = message.mentions.users.array()[0];
                if (!user) return message.channel.sendMessage("You need to mention the user");
                let list = Object.keys(warns);
                let found;
                //looking for the case id
                for (let i = 0; i < list.length; i++) {
                    if (warns[list[i]].user.id == user.id) {
                        found = list[i];
                        break;
                    }
                }
                if (!found) return message.channel.sendMessage('Nothing found for this user');
                message.channel.sendMessage(`Delete the case of ${warns[found].user.name}\nReason: ${warns[found].reason}`);
                delete warns[found];
                fs.writeFile("./data/warns.json", JSON.stringify(warns))
            } else {
                message.channel.sendMessage("",{
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Not playing!',
                    color: 0x008AF3,
                    description: 'I am currently not playing.',
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                })
            }
        }

        if (message.content.startsWith(prefix + 'pause')) {
            if (message.guild.owner.id == message.author.id || message.author.id == config.owner_id || config.admins.indexOf(message.author.id) != -1) {
                let player = message.guild.voiceConnection.player.dispatcher
                if (!player || player.paused) return message.channel.sendMessage("I am not playing", {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'You don\'t have perms :(',
                    color: 0x008AF3,
                    description: 'You have to be able to kick/ban members to use this command',
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                })
                player.pause();
                message.channel.sendMessage("Pausing music...");
            } else {
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Admin only!',
                    description: 'Sorry, this command is for the admins only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                });
            }
        }

        if (message.content.startsWith(prefix + 'reminder')) {
            try {
                let c = message.content.substring(message.content.indexOf(' ') + 1, message.content.length)
                let msg = c.split(" ").splice(1).join(" ").split("|")
                msg[0] = msg[0].replace(/\s/g, '')
                let time = parseTime(msg[0])
                let reminder = msg[1].trim()
                message.reply("I will DM you a reminder to " + reminder + " in " + time + "!")
                setTimeout(function() {
                    message.channel.sendMessage(message.author + " Reminder: " + reminder)
                }, time.countdown)

                function parseTime(str) {
                    let num, time
                    if (str.indexOf(" ") > -1) {
                        num = str.substring(0, str.indexOf(" "))
                        time = str.substring(str.indexOf(" ") + 1).toLowerCase()
                    } else {
                        for (let i = 0; i < str.length; i++) {
                            if (str.substring(0, i) && !isNaN(str.substring(0, i)) && isNaN(str.substring(0, i + 1))) {
                                num = str.substring(0, i)
                                time = str.substring(i)
                                break
                            }
                        }
                    }
                    if (!num || isNaN(num) || num < 1 || !time || ["d", "day", "days", "h", "hr", "hrs", "hour", "hours", "m", "min", "mins", "minute", "minutes", "s", "sec", "secs", "second", "seconds"].indexOf(time) == -1) {
                        return
                    }
                    let countdown = 0
                    switch (time) {
                        case "d":
                        case "day":
                        case "days":
                            countdown = num * 86400000
                            break
                        case "h":
                        case "hr":
                        case "hrs":
                        case "hour":
                        case "hours":
                            countdown = num * 3600000
                            break
                        case "m":
                        case "min":
                        case "mins":
                        case "minute":
                        case "minutes":
                            countdown = num * 60000
                            break
                        case "s":
                        case "sec":
                        case "secs":
                        case "second":
                        case "seconds":
                            countdown = num * 1000
                            break
                    }
                    return {
                        num: num,
                        time: time,
                        countdown: countdown
                    }
                }
            } catch (err) {
                message.channel.sendMessage("Invalid arguments.")
            }
        }

        if (message.content.startsWith(prefix + 'shutdown')) {
            if (message.author.id === config.owner_id || config.admins.indexOf(message.author.id) != -1) {
                message.channel.sendMessage("**Shutdown has been initiated**.\nShutting down...")
                setTimeout(function() {
                    bot.destroy()
                }, 1000)
                setTimeout(function() {
                    process.exit()
                }, 2000)
            }
        }

        if (message.content.startsWith(prefix + 'warn')) {
            if (message.channel.permissionsFor(message.author).hasPermission("KICK_MEMBERS") || message.channel.permissionsFor(message.author).hasPermission("BAN_MEMBERS")) {
                let c = message.content
                let usr = message.mentions.users.array()[0]
                if (!usr) return message.channel.sendMessage("You need to mention the user");
                let rsn = c.split(" ").splice(1).join(" ").replace(usr, "").replace("<@!" + usr.id + ">", "")
                let caseid = genToken(20)

                function genToken(length) {
                    let key = ""
                    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

                    for (let i = 0; i < length; i++) {
                        key += possible.charAt(Math.floor(Math.random() * possible.length))
                    }

                    return key
                }

                warns[caseid] = {
                    "admin": {
                        "name": message.author.username,
                        "discrim": message.author.discriminator,
                        "id": message.author.id
                    },
                    "user": {
                        "name": usr.username,
                        "discrim": usr.discriminator,
                        "id": usr.id
                    },
                    "server": {
                        "name": message.guild.name,
                        "id": message.guild.id,
                        "channel": message.channel.name,
                        "channel_id": message.channel.id
                    },
                    "reason": rsn
                }
                message.channel.sendMessage(usr + " was warned for `" + rsn + "`, check logs for more info")
                fs.writeFile("./data/warns.json", JSON.stringify(warns))
            } else {
                message.channel.sendMessage("", {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'You don\'t have perms :(',
                    color: 0x008AF3,
                    description: 'You have to be able to kick/ban members to use this command',
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                })
            }
        }

        if (message.content.startsWith(prefix + 'say')) {
            if (message.author.id === config.owner_id || config.admins.indexOf(message.author.id) != -1) {
                var say = message.content.split(" ").splice(1).join(" ")
                message.delete();
                message.channel.sendMessage(say)
            }
        }

        if (message.content.startsWith(prefix + 'eval')) {
            if (isCommander(message.author.id)) {
                try {
                    let code = message.content.split(" ").splice(1).join(" ")
                    let result = eval(code)
                    message.channel.sendMessage("```diff\n+ " + result + "```")
                } catch (err) {
                    message.channel.sendMessage("```diff\n- " + err + "```")
                }
            } else {
                message.channel.sendMessage("", {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Owner only!',
                    description: 'Sorry, this command is for the owner only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                })
            }
        }

        if (message.content.startsWith(prefix + 'volume')) {
            let suffix = message.content.split(" ")[1];
            var player = message.guild.voiceConnection.player.dispatcher
            if (!player || player.paused) return message.channel.sendMessage('No music m8, queue something with `' + prefix + 'play`');
            if (!suffix) {
                message.channel.sendMessage(`The current volume is ${(player.volume * 100)}`);
            } else if (message.guild.owner.id == message.author.id || message.author.id == config.owner_id || config.admins.indexOf(message.author.id) != -1) {
                let volumeBefore = player.volume
                let volume = parseInt(suffix);
                if (volume > 100) return message.channel.sendMessage("The music can't be higher then 100");
                player.setVolume((volume / 100));
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Volume changed',
                    color: 0x008AF3,
                    description: `Volume changed from ${(volumeBefore * 100)} to ${volume}`,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                });
            } else {
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Admin only!',
                    description: 'Sorry, only the admins can change the volume.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                });
            }
        }

        if (message.content.startsWith(prefix + 'resume')) {
            if (message.guild.owner.id == message.author.id || message.author.id == config.owner_id || config.admins.indexOf(message.author.id) != -1) {
                let player = message.guild.voiceConnection.player.dispatcher
                if (!player) return message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Not playing!',
                    color: 0x008AF3,
                    description: 'I am currently not playing.',
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                });
                if (player.playing) return message.channel.sendMessage('The music is already playing', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Already playing!',
                    color: 0x008AF3,
                    description: 'I am already playing.',
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                });
                var queue = getQueue(message.guild.id);
                bot.user.setGame(queue[0].title);
                player.resume();
                message.channel.sendMessage("Resuming music...", {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Resuming...',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                });
            } else {
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    title: 'Admin only!',
                    description: 'Sorry, only the admins can change the volume.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                });
            }
        }

        if (message.content.startsWith(prefix + 'invite')) {
            message.channel.sendMessage("My OAuth URL: " + `http://discordapp.com/oauth2/authorize?client_id=${config.client_id}&scope=bot&permissions=8`)
            console.log(prefix + 'invite');
        }
        if (message.content.startsWith(prefix + 'github')) {
            message.channel.sendMessage("GitHub URL: **https://github.com/CringyAdam/CringyBot**")
            console.log(prefix + 'github');
        }

        if (message.content.startsWith(prefix + 'about') || message.mentions.users.array()[0] === bot.user) {
            console.log(prefix + 'about');
            message.channel.sendMessage('', {
              embed: {
                author: {
                  name: bot.user.username,
                },
                color: 0x008AF3,
                title: 'Hi!',
                description: `I am CringyBot. I am written in discord.js and use ytdl to source songs and play them! To see all my commands type **${prefix}help**.`,
                timestamp: new Date(),
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: bot.user.avatarURL
                }

              }
            })
        }

        if (message.content.startsWith(prefix + 'np') || message.content.startsWith(prefix + 'nowplaying')) {
            console.log(prefix + 'np/nowplaying');
            let queue = getQueue(message.guild.id);
            if (queue.length == 0) return message.channel.sendMessage(message, "No music in queue");
            message.channel.sendMessage('', {
              embed: {
                author: {
                  name: bot.user.username
                },
                title: 'Currently playing',
                description: `Currently playing: ${queue[0].title} | by ${queue[0].requested}`,
                timestamp: new Date(),
                color: 0x008AF3,
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: bot.user.avatarURL
                }
              }
            });
        }

        if (message.content.startsWith(prefix + 'queue')) {
            console.log(prefix + 'queue');
            let queue = getQueue(message.guild.id);
            if (queue.length == 0) return message.channel.sendMessage("No music in queue", {
              embed: {
                author: {
                  name: bot.user.username
                },
                title: 'No music!',
                color: 0x008AF3,
                description: 'No music in queue.',
                timestamp: new Date(),
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: bot.user.avatarURL
                }
              }
            });
            let text = '';
            for (let i = 0; i < queue.length; i++) {
                text += `${(i + 1)}. ${queue[i].title} | requested by ${queue[i].requested}\n`
            };
            message.channel.sendMessage('', {
              embed: {
                author: {
                  name: bot.user.username
                },
                title: 'Queue:',
                description: `${text}`,
                timestamp: new Date(),
                color: 0x008AF3,
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: bot.user.avatarURL
                }
              }
            });
        }

        if (message.content.startsWith(prefix + 'google')) {
            let args = message.content.split(" ").slice(1);
            let search = args.join(' ');
            let input = args.join("+");
            let link = "https://www.google.com/search?site=&source=hp&q=" + input;
            message.channel.sendMessage('', {
              embed: {
                author: {
                  name: bot.user.username
                },
                color: 0x008AF3,
                title: 'Google search results:',
                description: `Results for **${search}**: Click [here](${link})!`,
                timestamp: new Date(),
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: bot.user.avatarURL
                }
              }
           });
           console.log(prefix + `google ${search}`);
        }

          if (message.content.startsWith(prefix + 'kick')) {
            if (message.author.id !== config.owner_id) return;
            if (message.mentions.users.size == 0) {
              message.channel.sendMessage('', {
                embed: {
                  author: {
                    name: bot.user.username
                  },
                  color: 0x88AF3,
                  title: 'Syntax error',
                  description: 'No user mentioned. can\'t kick.',
                  timestamp: new Date(),
                  footer: {
                    text: 'CringyBot Normal edition',
                    icon_url: bot.user.avatarURL
                  }
                }
              });
              console.log(prefix + 'kick ' + kickMember);
            }
            let kickMember = message.guild.member(message.mentions.users.first());
            if (!kickMember) {
              message.channel.sendMessage('', {
                embed: {
                  author: {
                    name: bot.user.username
                  },
                  color: 0x88AF3,
                  title: 'Invalid user',
                  description: 'That user is invalid.',
                  timestamp: new Date(),
                  footer: {
                    text: 'CringyBot Normal edition',
                    icon_url: bot.user.avatarURL
                  }
                }
              });
              console.log(prefix + 'kick ' + kickMember);
            }
            if (!message.guild.member(bot.user).hasPermission('KICK_MEMBERS')) {
              message.channel.sendMessage('', {
                embed: {
                  author: {
                    name: bot.user.username
                  },
                  color: 0x88AF3,
                  title: 'No permissions',
                  description: `I don\'t have the required permissions to kick ${kickMember}.`,
                  timestamp: new Date(),
                  footer: {
                    text: 'CringyBot Normal edition',
                    icon_url: bot.user.avatarURL
                  }
                }
              });
              console.log(prefix + 'kick ' + kickMember);
            }
            message.delete();
            kickMember.kick().then(member => {
              message.channel.sendMessage('', {
                embed: {
                  author: {
                    name: bot.user.username
                  },
                  color: 0x88AF3,
                  title: `Successfully kicked ${kickMember}`,
                  description: 'Ohh, that felt good.',
                  timestamp: new Date(),
                  footer: {
                    text: 'CringyBot Normal edition',
                    icon_url: bot.user.avatarURL
                  }
                }
              });
            });
            console.log(prefix + 'kick ' + kickMember);
          }

          if (message.content.startsWith(prefix + 'nick')) {
            let args = message.content.split(" ").slice(1);
            let nickname = args.join(" ");
            if (!message.guild.member(bot.user).hasPermission('CHANGE_NICKNAME')) {
              message.channel.sendMessage('', {
                embed: {
                  author: {
                    name: bot.user.username
                  },
                  color: 0x008AF3,
                  title: 'No permissions',
                  description: 'I don\'t have the required permissionsto change my nickname.',
                  timestamp: new Date(),
                  footer: {
                    text: 'CringyBot Normal edition',
                    icon_url: bot.user.avatarURL
                  }
                }
              });
              console.log(prefix + 'nick');
            } else {
                message.guild.member(bot.user).setNickname(nickname);
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: bot.user.username
                    },
                    color: 0x008AF3,
                    title: 'Nickname changed successfully!',
                    description: `Nickname changed to **${nickname}**!`,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: bot.user.avatarURL
                    }
                  }
                });
                console.log(prefix + 'nick');
              }
            }

            if (message.content.startsWith(prefix + 'game')) {
              let args = message.content.split(" ").slice(1);
              let game = args.join(" ");
              bot.user.setGame(game);
              message.channel.sendMessage('', {
                embed : {
                  author: {
                    name: bot.user.username
                  },
                  title: 'Game successfully changed!',
                  color: 0x008AF3,
                  description: `Game changed to **${game}**!`,
                  timestamp: new Date(),
                  footer: {
                    text: 'CringyBot Selfbot edition',
                    icon_url: bot.user.avatarURL
                  }
                }
              });
              console.log(prefix + 'game');
            }

    } catch (err) {
        console.log("WELL LADS LOOKS LIKE SOMETHING WENT WRONG! This is the error:\n\n\n" + err.stack)
        errorlog[String(Object.keys(errorlog).length)] = {
            "code": err.code,
            "error": err,
            "stack": err.stack
        }
        fs.writeFile("./data/errors.json", JSON.stringify(errorlog), function(err) {
            if (err) return console.log("Even worse we couldn't write to our error log file! Make sure data/errors.json still exists!");
        })

    }
})

bot.login(config.token)

process.on("unhandledRejection", err => {
    console.error("Uncaught We had a promise error, if this keeps happening report to dev server: \n" + err.stack);
});
