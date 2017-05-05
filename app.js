/*
       © Copyright Adam Aharony (a.k.a. Cringy Adam) ©
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


const client = new Discord.Client();
const notes = require('./data/notes.json');
const os = require('os');
const prefix = config.prefix;
const rb = "```";
const sbl = require("./data/blservers.json");
const ubl = require("./data/blusers.json");
const fs = require("fs");
const warns = require("./data/warns.json");
const queues = {};
const google = require('google');
const ytdl = require('ytdl-core');
const search = require('youtube-search');
const opts = {
    part: 'snippet',
    maxResults: 10,
    key: config.youtube_api_key
}
var intent;

function getQueue(guild) {
    if (!guild) return;
    if (typeof guild == 'object') guild = guild.id;
    if (queues[guild]) return queues[guild];
    else queues[guild] = [];
    return queues[guild];
}

function getRandomInt(max) {
    return Math.floor(Math.random() * (max + 1));
}

var paused = {};


function play(message, queue, song) {
    try {
        if (!message || !queue) return;
        if (song) {
            search(song, opts, function(err, results) {
               if (err) {
                 message.channel.sendMessage('', {
                   embed: {
                     author: {
                       name: client.user.username
                     },
                     title: 'Not found :(',
                     description: 'Video not found. Please try to use a youtube link instead.',
                     color: 0x008AF3,
                     timestamp: new Date(),
                     footer: {
                       text: 'CringyBot Normal edition',
                       icon_url: client.user.avatarURL
                     }
                   }
                 });
               }
                song = (song.includes("https://" || "http://")) ? song : results[0].link;
                let stream = ytdl(song, {audioonly: true});
                let test;
                if (queue.length === 0) test = true
                queue.push({
                    "title": results[0].title,
                    "requested": message.author.username,
                    "toplay": stream
                });
                console.log("Queued " + queue[queue.length - 1].title + " in " + message.guild.name + " as requested by " + queue[queue.length - 1].requested);
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Queued.',
                    description: `Queued **${queue[queue.length - 1].title}**`,
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
                if (test) {
                    setTimeout(function() {
                        play(message, queue)
                    }, 1000)
                }
            })
        } else if (queue.length !== 0) {
            message.channel.sendMessage('', {
              embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Now playing:',
                    description: `**${queue[0].title}** | Requested by ***${queue[0].requested}***`,
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
            });
            console.log(`Playing ${queue[0].title} as requested by ${queue[0].requested} in ${message.guild.name}`);
            let connection = message.guild.voiceConnection;
            if (!connection) return console.log("No Connection!");
            intent = connection.playStream(queue[0].toplay);

            intent.on('error', () => {
                queue.shift();
                play(message, queue);
            })

            intent.on('end', () => {
                queue.shift();
            })
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
        });

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



client.on('guildDelete', guild => {
    client.channels.get(config.logchannel).sendMessage(`I have left ${guild.name}. I hope to come back there another day.`);
});


client.on('guildCreate', guild => {
    client.channels.get(config.logchannel).sendMessage(`I have joined another server called **${guild.name}**!`);
});

client.on('guildMemberAdd', member => {
    let guild = member.guild;
    guild.defaultChannel.sendMessage(`Thanks to **${member.user.username}** for joining ${guild.name}!`);
});

client.on('guildMemberRemove', member => {
    let guild = member.guild;
    guild.defaultChannel.sendMessage(`Goodbye **${member.user.username}** we will miss you!`);
});

client.on('guildBanAdd', (guild, user) => {
    guild.defaultChannel.sendMessage(`**${user.username}** was just banned`);
});

client.on('guildBanRemove', (guild, user) => {
    guild.defaultChannel.sendMessage(`**${user.username}** was just unbanned!`);
});


client.on('channelCreate', channel => {
    console.log(`A ${channel.type} channel by the name of ${channel.name} was created ${channel.createdAt} with the ID of ${channel.id}`);
    if (channel.type === 'text') return channel.sendMessage('Channel was created successfully!');
});

client.on('channelDelete', channel => {
    console.log(`A ${channel.type} by the name of ${channel.name} was successfully deleted.`);
    channel.guild.defaultChannel.sendMessage('Channel deleted successfully');
});






client.on('ready', function() {
    client.user.setGame('with Cringy Adam', "https://twitch.tv/cringyadam");
    try {
        config.client_id = client.user.id;
        client.user.setStatus('online', config.status)
        var message = `
------------------------------------------------------
> Logging in...
------------------------------------------------------
Logged in as ${client.user.username}#${client.user.discriminator}
On ${client.guilds.size} servers!
${client.channels.size} channels and ${client.users.size} users cached!
I am logged in and ready to roll!
LET'S GO!
------------------------------------------------------`

        console.log(message)
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

client.on('voiceStateUpdate', function(oldMember, newMember) {
	var svr = client.guilds.array()
    for (var i = 0; i < svr.length; i++) {
        if (svr[i].voiceConnection) {
            if (paused[svr[i].voiceConnection.channel.id]) {
                if (svr[i].voiceConnection.channel.members.size > 1) {
					paused[svr[i].voiceConnection.channel.id].player.resume()
					var game = client.user.presence.game.name;
                    delete paused[svr[i].voiceConnection.channel.id]
                    game = game.split("⏸")[1];
                }
            }
            if (svr[i].voiceConnection.channel.members.size === 1 && !svr[i].voiceConnection.player.dispatcher.paused) {
                svr[i].voiceConnection.player.dispatcher.pause();
                var game = client.user.presence.game.name;
                paused[svr[i].voiceConnection.channel.id] = {
                    "player": svr[i].voiceConnection.player.dispatcher
                }
            }
        }
    }
});

client.on("message", function(message) {
    function isCommander(member) {
      let adminRole = message.guild.roles.find("name", "CringyBot Admin");
	    if (message.author.id == config.owner_id) {
		    return true;
	    } else if (member.roles.has(adminRole.id)) {
        return true;
      }
      else {
        return false;s
      }
    }
    
    
    
    try {
        if (!message.author.client) return;

        if (sbl.indexOf(message.guild.id) != -1 && message.content.startsWith(prefix)) {
            message.channel.sendMessage("", {
              embed: {
                author: {
                  name: client.user.username
                },
                title: 'Blacklisted server!',
                description: 'This server is blacklisted!',
                color: 0x008AF3,
                timestamp: new Date(),
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: client.user.avatarURL
                }
              }
            })
            return
        }


        if (ubl.indexOf(message.author.id) != -1 && message.content.startsWith(prefix)) {
            message.reply("you are blacklisted and can\'t use the bot!")
            return
        }


        if (message.content.startsWith(prefix + "ping")) {
            var before = Date.now()
            message.channel.sendMessage("Pong!").then(function(message) {
                var after = Date.now()
                message.edit("Pong! **" + (after - before) + "**ms")

            })
        }


        if (message.content.startsWith(prefix + 'sendmsg')) {
          if (!isCommander(message.member)) return message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Admin only!',
                    description: 'Sorry, this command is for the admins only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
          var args = message.content.split(/[ ]+/);
          let reason = args.slice(2).join(" ");
          if(message.author.id !== config.owner_id) return;
          if (message.content.split(" ")[1] === undefined) {
            message.reply("Please insert a channel ID.");
            return;
          }
          if (client.channels.get(message.content.split(" ")[1]) == undefined) {
            message.reply("Not a valid channel ID.");
            return;
          }
          if(reason.length < 1) return;
          message.delete();
          client.channels.get(message.content.split(" ")[1]).sendMessage(reason);

        }


        if (message.content.startsWith(prefix + 'help')) {
            message.reply("check your DM's :mailbox:");
            message.author.sendMessage('', {
              embed: {
                author: {
                  name: client.user.username
                },
                title: 'Bot help:',
                color: 0x008AF3,
                description : `
    **${prefix}help** - Shows this message.
    **${prefix}ping** - Ping/Pong with ms amount.
    **${prefix}servers** Shows amount of servers.
    **${prefix}play** - Plays the song you requested.
    **${prefix}voteskip** - You may vote to skip a song.
    **${prefix}volume** <volume> - Change the volume.
    **${prefix}queue** - Check the list of songs that are queued.
    **${prefix}np/nowplaying** - Check the current song out.
    **${prefix}skip** - Skips the playing song.
    **${prefix}pause** - Pause the current song.
    **${prefix}deletewarn** <user> - Deletes a warning from a user.
    **${prefix}lookupwarn** <user> - Lookup warning information on a user.
    **${prefix}eval** - Owner only.
    **${prefix}clearqueue** - Clears the list of queues.
    **${prefix}say** - Admin only.
    **${prefix}sendmsg** <channel_ID> <message_text> - Owner only. Sends a message to a channel.
    **${prefix}resume** - Resumes paused song.
    **${prefix}about** - Info about the bot.
    **${prefix}kick** - Admin only. Kicks a user.
    **${prefix}nick** - Changes the bot's Nickname.
    **${prefix}game** - Sets the bot's game.
    **${prefix}google** <stuff_to_search> - Searches Google.
    **${prefix}purge** <number of messages to delete> - Admin only - deletes the number of messages you asked for.
    **${prefix}invite** - Creates OAuth URL for bot.
    **${prefix}github** - Sends link to github repo.
    **${prefix}play** - Plays a link that you have wanted it to.
    **${prefix}userblacklist** <add/remove> <user id> - Blacklists a user.
    **${prefix}warn** <user> <reason> - Warns a user for the thing they did wrong.
    **${prefix}serverblacklist** <add/remove> <server id> - Adds or removes servers from blacklist.
    **${prefix}uptime** - Shows bot uptime.
    **${prefix}shutdown** - Owner only - Shuts down the bot.`,
								timestamp: new Date(),
								footer: {
									text: 'To enable admin functionality on your server, give the "CringyBot Admin" role to the bot admins.',
									icon_url: client.user.avatarURL
								}
              }
            })
						message.author.sendMessage("If you need any help, join the dev server at http://adampro.cu.cc/discord")
        }


        if (message.content.startsWith(prefix + 'servers')) {
						const embed = new Discord.RichEmbed()
						client.guilds.forEach(guild => embed.addField(guild.name, guild.id))
						message.channel.sendEmbed(embed)
        }


        if (message.content === prefix + 'uptime') {
            message.channel.sendMessage("secondsToString(process.uptime())", {
              embed: {
                author: {
                  name: client.user.username
                },
                title: 'Uptime',
                description: `I have been up for ${secondsToString(process.uptime())} - My process was started at ${started}`,
                color: 0x008AF3,
                timestamp: new Date(),
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: client.user.avatarURL
                }
              }
            })
        }


        if (message.content.startsWith(prefix + 'play')) {
            if (!message.guild.voiceConnection) {
                if (!message.member.voiceChannel) return message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Join a voice channel first!',
                    description: 'You need to be in a voice channel.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
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
                  name: client.user.username
                },
                title: 'Specify a song',
                description: 'You need to specify a song name or a link.',
                color: 0x008AF3,
                timestamp: new Date(),
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: client.user.avatarURL
                }
              }
            })

            play(message, getQueue(message.guild.id), suffix);
        }


        if (message.content.startsWith(prefix + 'sys')) {
            message.channel.sendMessage(`${rb}xl\nSystem info: ${process.platform} - ${process.arch} with ${process.release.name} version ${process.version.slice(1)}\nProcess info: PID ${process.pid} at ${process.cwd()}\nProcess memory usage:${Math.ceil(process.memoryUsage().heapTotal / 1000000)}MB\nSystem memory usage: ${Math.ceil((os.totalmem() - os.freemem()) / 1000000)} of ${Math.ceil(os.totalmem() / 1000000)}MB\nBot info: ID ${client.user.id}#${client.user.discriminator}\n${rb}`);
        }


        if (message.content.startsWith(prefix + "serverblacklist")) {
            if (isCommander(message.member)) {
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
                          name: client.user.username
                        },
                        title: 'Admin only!',
                        description: 'Sorry, this command is for the admins only.',
                        color: 0x008AF3,
                        timestamp: new Date(),
                        footer: {
                          text: 'CringyBot Normal edition',
                          icon_url: client.user.avatarURL
                        }
                      }
                    });
               }
            } else {
                message.channel.sendMessage("", {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Owner only!',
                    description: 'Sorry, this command is for the owner only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                })
            }

        }


        if (message.content.startsWith(prefix + "userblacklist")) {
            if (isCommander(message.member)) {
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
                          name: client.user.username
                        },
                        title: 'Specify what to do!',
                        description: `Do ${prefix}userblacklist <add/remove> <server id>`,
                        color: 0x008AF3,
                        timestamp: new Date(),
                        footer: {
                          text: 'CringyBot Normal edition',
                          icon_url: client.user.avatarURL
                        }
                      }
                    })
                }
            } else {
                message.channel.sendMessage("",{
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Admin only!',
                    description: 'Sorry, this command is for the admins only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                })
            }
        }


        if (message.content.startsWith(prefix + "clear")) {
            if (isCommander(message.member)) {
                let queue = getQueue(message.guild.id);
                if (queue.length == 0) return message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'No music!',
                    description: 'No music in queue',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
                for (var i = queue.length - 1; i >= 0; i--) {
                    queue.splice(i, 1);
                }
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Queue cleared!',
                    description: 'Cleared the queue.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                })
            } else {
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Admin only!',
                    description: 'Sorry, this command is for the admins only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
            }
        }


        if (message.content.startsWith(prefix + "lookupwarn")) {
            if (isCommander(message.member)) {
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
                      name: client.user.username
                    },
                    title: 'Owner only!',
                    description: 'Sorry, this command is for the owner only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
            }
        }


        if (message.content.startsWith(prefix + 'skip')) {
            if (isCommander(message.member)) {
                let player = message.guild.voiceConnection.player.dispatcher
                if (!player || player.paused) return message.channel.sendMessage("", {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Not playing!',
                    color: 0x008AF3,
                    description: 'I am currently not playing.',
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                })
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Skipping...',
                    color: 0x008AF3,
                    description: 'Skipping song...',
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
                player.end()
            } else {
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Admin only!',
                    description: 'Sorry, this command is for the admins only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
            }
        }


        if (message.content.startsWith(prefix + "deletewarn")) {
            if (isCommander(message.member)) {
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
                      name: client.user.username
                    },
                    title: 'Not playing!',
                    color: 0x008AF3,
                    description: 'I am currently not playing.',
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                })
            }
        }


        if (message.content.startsWith(prefix + 'pause')) {
            if (isCommander(message.member)) {
                let player = message.guild.voiceConnection.player.dispatcher
                if (!player || player.paused) return message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Not playing :(',
                    color: 0x008AF3,
                    description: 'I am not playing. Queue some music!',
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                })
                player.pause();
            } else {
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Admin only!',
                    description: 'Sorry, this command is for the admins only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
            }
        }


        if (message.content.startsWith(prefix + 'shutdown')) {
          if (!isCommander(message.member)) return;
          process.exit();
        }


        if (message.content.startsWith(prefix + 'warn')) {
            if (isCommander(message.member)) {
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
              message.channel.sendMessage('', {
                      embed: {
                        author: {
                          name: client.user.username
                        },
                        title: 'Admin only!',
                        description: 'Sorry, this command is for the admins only.',
                        color: 0x008AF3,
                        timestamp: new Date(),
                        footer: {
                          text: 'CringyBot Normal edition',
                          icon_url: client.user.avatarURL
                        }
                      }
                    });
            }
        }


        if (message.content.startsWith(prefix + 'say')) {
            if (isCommander(message.member)) {
                var say = message.content.split(" ").splice(1).join(" ");
                message.delete();
                message.channel.sendMessage(say);
            }
        }


        if (message.content.startsWith(prefix + 'eval')) {
            if (isCommander(message.member)) {
                try {
                    let code = message.content.split(" ").splice(1).join(" ")
                    if (code == "config.token" || code == "client.token" || code == "token") {
                      message.channel.sendMessage('', {
                        embed: {
                          author: {
                            name: client.user.username
                          },
                          color: 0x88AF3,
                          title: 'Security warning!',
                          description: 'Successfully blocked token leak!',
                          timestamp: new Date(),
                          footer: {
                            text: 'CringyBot Normal edition',
                            icon_url: client.user.avatarURL
                          }
                        }
                      });
                      return;
                    }
                    let result = eval(code)
                    message.channel.sendMessage("```diff\n+ " + result + "```")
                } catch (err) {
                    message.channel.sendMessage("```diff\n- " + err + "```")
                }
            } else {
                message.channel.sendMessage("", {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Owner only!',
                    description: 'Sorry, this command is for the owner only.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                })
            }
        }


        if (message.content.startsWith(prefix + 'volume')) {
            let suffix = message.content.split(" ")[1];
            var player = message.guild.voiceConnection.player.dispatcher
            if (!player || player.paused) return message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'No music :(',
                    color: 0x008AF3,
                    description: `No music m8, queue something with **${prefix}play**`,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
            });
            if (!suffix) {
                message.channel.sendMessage(`The current volume is ${(player.volume * 100)}`, {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Current volume:',
                    color: 0x008AF3,
                    description: `The current volume is ${(player.volume * 100)}`,
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
            } else if (isCommander(message.member)) {
                let volumeBefore = player.volume
                let volume = parseInt(suffix);
                if (volume > 100) return message.channel.sendMessage("The volume cannot be higher then 100");
                player.setVolume((volume / 100));
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Volume changed',
                    color: 0x008AF3,
                    description: `Volume changed from ${(volumeBefore * 100)} to ${volume}`,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
            } else {
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Admin only!',
                    description: 'Sorry, only the admins can change the volume.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
            }
        }


        if (message.content.startsWith(prefix + 'resume')) {
            if (isCommander(message.member)) {
                let player = message.guild.voiceConnection.player.dispatcher
                if (!player) return message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Not playing!',
                    color: 0x008AF3,
                    description: 'I am currently not playing.',
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
                if (player.playing) return message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Already playing!',
                    color: 0x008AF3,
                    description: 'I am already playing.',
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
                var queue = getQueue(message.guild.id);
                client.user.setGame(queue[0].title);
                player.resume();
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Resuming...',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
            } else {
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    title: 'Admin only!',
                    description: 'Sorry, only the admins can change the volume.',
                    color: 0x008AF3,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
            }
        }


        if (message.content.startsWith(prefix + 'invite')) {
            if (isCommander(message.member)) return message.channel.sendMessage(`To invite this bot to your server, use https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=8`);
            else return message.channel.sendMessage('To request an invite of the bot to your server, go to http://adampro.cu.cc/discord');
      }


        if (message.content.startsWith(prefix + 'github')) {
            message.channel.sendMessage("GitHub URL: **https://github.com/CringyAdam/CringyBot**")
            console.log(prefix + 'github');
        }


        if (message.content.startsWith(prefix + 'about') || message.mentions.users.array()[0] === client.user) {
            console.log(prefix + 'about');
            message.channel.sendMessage('', {
              embed: {
                author: {
                  name: client.user.username,
                },
                color: 0x008AF3,
                title: 'Hi!',
                description: `I am CringyBot by Cringy Adam. I am written in discord.js and use ytdl to source songs and play them! To see all my commands type **${prefix}help**.\nIf you need any help, join the dev server at http://adampro.cu.cc/discord`,
                timestamp: new Date(),
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: client.user.avatarURL
                }

              }
            })
        }


        if (message.content.startsWith(prefix + 'np') || message.content.startsWith(prefix + 'nowplaying')) {
            console.log(prefix + 'np/nowplaying');
            let queue = getQueue(message.guild.id);
            if (queue.length == 0) return message.channel.sendMessage('', {
              embed: {
                author: {
                  name: client.user.username
                },
                title: 'No music!',
                color: 0x008AF3,
                description: 'No music in queue.',
                timestamp: new Date(),
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: client.user.avatarURL
                }
              }
            });
            message.channel.sendMessage('', {
              embed: {
                author: {
                  name: client.user.username
                },
                title: 'Currently playing',
                description: `Currently playing: ${queue[0].title} | by ${queue[0].requested}`,
                timestamp: new Date(),
                color: 0x008AF3,
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: client.user.avatarURL
                }
              }
            });
        }


        if (message.content.startsWith(prefix + 'queue')) {
            console.log(prefix + 'queue');
            let queue = getQueue(message.guild.id);
            if (queue.length == 0) return message.channel.sendMessage('', {
              embed: {
                author: {
                  name: client.user.username
                },
                title: 'No music!',
                color: 0x008AF3,
                description: 'No music in queue.',
                timestamp: new Date(),
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: client.user.avatarURL
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
                  name: client.user.username
                },
                title: 'Queue:',
                description: `${text}`,
                timestamp: new Date(),
                color: 0x008AF3,
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: client.user.avatarURL
                }
              }
            });
        }


        if (message.content.startsWith(prefix + 'google')) {
          let args = message.content.split(" ").slice(1);
          let input = args.join(" ");
          google.resultsPerPage = 1
          var nextCounter = 0
 
          google(input, function (err, res){
             if (err) console.error(err);
              for (var i = 0; i < res.links.length; ++i) {
              var link = res.links[i];
              message.channel.sendMessage('', {
                embed: {
                  author: {
                    name: client.user.username,
                    icon_url: "http://i.imgur.com/EdV2r11.png"
                  },
                  title: `${link.title}`,
                  url: `${link.href}`,
                  color: 0x008AF3,
                  description: `${link.description}\n**Click [here](${link.href}) to go to the link.**`,
                  timestamp: new Date(),
                  footer: {
                    text: 'CringyBot Normal edition',
                    icon_url: client.user.avatarURL
                  }
                }
              })
            }
          })
          console.log(prefix + `google ${search}`);
        }


          if (message.content.startsWith(prefix + 'kick')) {
            if (!isCommander(message.member)) return message.channel.sendMessage('', {
                      embed: {
                        author: {
                          name: client.user.username
                        },
                        title: 'Admin only!',
                        description: 'Sorry, this command is for the admins only.',
                        color: 0x008AF3,
                        timestamp: new Date(),
                        footer: {
                          text: 'CringyBot Normal edition',
                          icon_url: client.user.avatarURL
                        }
                      }
                    });
							message.channel.sendMessage('', {
								embed: {
									author: {
										name: client.user.username
									},
									title: 'Admin only!',
									description: 'Sorry, only the admins can change the volume.',
									color: 0x008AF3,
									timestamp: new Date(),
									footer: {
										text: 'CringyBot Normal edition',
										icon_url: client.user.avatarURL
									}
								}
							});
						
							if (message.mentions.users.size == 0) {
	              message.channel.sendMessage('', {
	                embed: {
	                  author: {
	                    name: client.user.username
	                  },
	                  color: 0x88AF3,
	                  title: 'Syntax error',
	                  description: 'No user mentioned. can\'t kick.',
	                  timestamp: new Date(),
	                  footer: {
	                    text: 'CringyBot Normal edition',
	                    icon_url: client.user.avatarURL
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
	                    name: client.user.username
	                  },
	                  color: 0x88AF3,
	                  title: 'Invalid user',
	                  description: 'That user is invalid.',
	                  timestamp: new Date(),
	                  footer: {
	                    text: 'CringyBot Normal edition',
	                    icon_url: client.user.avatarURL
	                  }
	                }
	              });
	              console.log(prefix + 'kick ' + kickMember);
	            }
	            if (!message.guild.member(client.user).hasPermission('KICK_MEMBERS')) {
	              message.channel.sendMessage('', {
	                embed: {
	                  author: {
	                    name: client.user.username
	                  },
	                  color: 0x88AF3,
	                  title: 'No permissions',
	                  description: `I don\'t have the required permissions to kick ${kickMember}.`,
	                  timestamp: new Date(),
	                  footer: {
	                    text: 'CringyBot Normal edition',
	                    icon_url: client.user.avatarURL
	                  }
	                }
	              });
	              console.log(prefix + 'kick ' + kickMember);
	            }
	            kickMember.kick().then(member => {
	              message.channel.sendMessage('', {
	                embed: {
	                  author: {
	                    name: client.user.username
	                  },
	                  color: 0x88AF3,
	                  title: `Successfully kicked ${kickMember}`,
	                  description: 'Ohh, that felt good.',
	                  timestamp: new Date(),
	                  footer: {
	                    text: 'CringyBot Normal edition',
	                    icon_url: client.user.avatarURL
	                  }
	                }
	              });
	            });
	            console.log(prefix + 'kick ' + kickMember);
          }


          if (message.content.startsWith(prefix + 'nick')) {
						if (message.author.id !== config.owner_id) return;
						let args = message.content.split(" ").slice(1);
            let nickname = args.join(" ");
            if (!message.guild.member(client.user).hasPermission('CHANGE_NICKNAME')) {
              message.channel.sendMessage('', {
                embed: {
                  author: {
                    name: client.user.username
                  },
                  color: 0x008AF3,
                  title: 'No permissions',
                  description: 'I don\'t have the required permissionsto change my nickname.',
                  timestamp: new Date(),
                  footer: {
                    text: 'CringyBot Normal edition',
                    icon_url: client.user.avatarURL
                  }
                }
              });
              console.log(prefix + 'nick');
            } else {
                message.guild.member(client.user).setNickname(nickname);
                message.channel.sendMessage('', {
                  embed: {
                    author: {
                      name: client.user.username
                    },
                    color: 0x008AF3,
                    title: 'Nickname changed successfully!',
                    description: `Nickname changed to **${nickname}**!`,
                    timestamp: new Date(),
                    footer: {
                      text: 'CringyBot Normal edition',
                      icon_url: client.user.avatarURL
                    }
                  }
                });
                console.log(prefix + 'nick');
              }
            }


            if (message.content.startsWith(prefix + 'game')) {
              if (isCommander(message.member)) return message.channel.sendMessage('', {
                      embed: {
                        author: {
                          name: client.user.username
                        },
                        title: 'Admin only!',
                        description: 'Sorry, this command is for the admins only.',
                        color: 0x008AF3,
                        timestamp: new Date(),
                        footer: {
                          text: 'CringyBot Normal edition',
                          icon_url: client.user.avatarURL
                        }
                      }
                    });
              let args = message.content.split(" ").slice(1);
              let game = args.join(" ");
              client.user.setGame(game);
              message.channel.sendMessage('', {
                embed : {
                  author: {
                    name: client.user.username
                  },
                  title: 'Game successfully changed!',
                  color: 0x008AF3,
                  description: `Game changed to **${game}**!`,
                  timestamp: new Date(),
                  footer: {
                    text: 'CringyBot Normal edition',
                    icon_url: client.user.avatarURL
                  }
                }
              });
              console.log(prefix + 'game');
            }


          if (message.content.startsWith(prefix + 'stream')) {
            if (isCommander(message.member)) return message.channel.sendMessage('', {
                      embed: {
                        author: {
                          name: client.user.username
                        },
                        title: 'Admin only!',
                        description: 'Sorry, this command is for the admins only.',
                        color: 0x008AF3,
                        timestamp: new Date(),
                        footer: {
                          text: 'CringyBot Normal edition',
                          icon_url: client.user.avatarURL
                        }
                      }
                    });
            let args = message.content.split(" ").slice(1);
            let stream = args.join(" ");
            client.user.setGame(stream, 'http://twitch.tv/cringyadam');
            message.channel.sendMessage('', {
              embed : {
                author: {
                  name: client.user.username
                },
                title: 'Streaming status successfully changed!',
                color: 0x008AF3,
                description: `Stream changed to **${stream}**!`,
                timestamp: new Date(),
                footer: {
                  text: 'CringyBot Normal edition',
                  icon_url: client.user.avatarURL
                }
              }
            });
            console.log(prefix + 'stream');
          }


        if (message.content.startsWith(prefix + 'purge')) {
         if (isCommander(message.member)) return message.channel.sendMessage('', {
								embed: {
									author: {
										name: client.user.username
									},
									title: 'Admin only!',
									description: 'Sorry, only the admins can change the volume.',
									color: 0x008AF3,
									timestamp: new Date(),
									footer: {
										text: 'CringyBot Normal edition',
										icon_url: client.user.avatarURL
									}
								}
							});
         let args = message.content.split(" ").slice(1);
             let messagecount = parseInt(args.join(" "));
              message.channel.fetchMessages({
                limit: messagecount
              }).then(messages => message.channel.bulkDelete(messages));
              message.channel.sendMessage('', {
                embed: {
                  author: {
                    name: client.user.username
                  },
                  color: 0x008AF3,
                  title: 'Messages deleted successfully!',
                  description: `Deleted ${messagecount} messages successfully`,
                  timestamp: new Date,
                  footer: {
                    text: 'CringyBot Normal edition',
                    icon_url: client.user.avatarURL
                  }
                }
            }) 
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

client.login(config.token)

process.on("unhandledRejection", err => {
    console.error("Uncaught We had a promise error, if this keeps happening report to dev server: \n" + err.stack);
});
