const ytdl = require("ytdl-core-discord");
const ytdl_style = require("ytdl-core");
const Discord = require("discord.js");
const { canModifyQueue, STAY_TIME } = require("../util/EvobotUtil");
module.exports = {
  async play(song, message, args) {


    let config;

    try {
      config = require("../config.json");
    } catch (error) {
      config = null;
    }

    const PRUNING = config ? config.PRUNING : process.env.PRUNING;

    const queue = message.client.queue.get(message.guild.id);

    if (!song) {
      setTimeout(function () {
        if (queue.connection.dispatcher && message.guild.me.voice.channel) return;
        queue.channel.leave();
      }, STAY_TIME * 1000);
      queue.textChannel.send("❌ Очередь закончилась")
      
      .catch(console.error);
      return message.client.queue.delete(message.guild.id);
    }

    let stream = null;
    let streamType = song.url.includes("youtube.com") ? "opus" : "ogg/opus";

    try {
      if (song.url.includes("youtube.com")) {
        stream = await ytdl(song.url, { highWaterMark: 1 << 25 });
      }
    } catch (error) {
      if (queue) {
        queue.songs.shift();
        module.exports.play(queue.songs[0], message);
      }

      console.error(error);
      return message.channel.send(`Error: ${error.message ? error.message : error}`);
    }

    queue.connection.on("disconnect", () => message.client.queue.delete(message.guild.id));

    const dispatcher = queue.connection
      .play(stream, { type: streamType })
      .on("finish", () => {
        if (collector && !collector.ended) collector.stop();

        if (queue.loop) {
          // if loop is on, push the song back at the end of the queue
          // so it can repeat endlessly
          let lastSong = queue.songs.shift();
          queue.songs.push(lastSong);
          module.exports.play(queue.songs[0], message);
        } else {
          // Recursively play the next song
          queue.songs.shift();
          module.exports.play(queue.songs[0], message);
        }
      })
      .on("error", (err) => {
        console.error(err);
        queue.songs.shift();
        module.exports.play(queue.songs[0], message);
      });
    dispatcher.setVolumeLogarithmic(queue.volume / 100);
    const url = args;
    songInfo = await ytdl_style.getInfo(song.url);
    song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
      duration: songInfo.videoDetails.lengthSeconds,
      thumbnails: songInfo.videoDetails.thumbnails[3].url,
      
    };
    
    const addedEmbed = new Discord.MessageEmbed()
    .setColor('GREEN')
    .setTitle(`:musical_note: Сейчас играет :musical_note:\n ${song.title} `)
    .addField(`Продолжительность: `,new Date(song.duration * 1000).toISOString().substr(11, 8))

    .setThumbnail(song.thumbnails)
    .setURL(song.url);
  
    

    try {
      var playingMessage = await queue.textChannel.send(addedEmbed)
      await playingMessage.react("⏭");
      await playingMessage.react("⏯");
      await playingMessage.react("🔇");
      await playingMessage.react("🔉");
      await playingMessage.react("🔊");
      await playingMessage.react("🔁");
      await playingMessage.react("⏹");
    } catch (error) {
      console.error(error);
    }

    const filter = (reaction, user) => user.id !== message.client.user.id;
    var collector = playingMessage.createReactionCollector(filter, {
      time: song.duration > 0 ? song.duration * 1000 : 600000
    });

    collector.on("collect", (reaction, user) => {
      if (!queue) return;
      const member = message.guild.member(user);

      switch (reaction.emoji.name) {
        case "⏭":
          queue.playing = true;
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member)) return;
          queue.connection.dispatcher.end();
          queue.textChannel.send(`${user} ⏩ пропустил трек`)
          .then (queue => queue.delete({ timeout : 1500 }))
          .catch(console.error);
          collector.stop();
          break;

        case "⏯":
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member)) return;
          if (queue.playing) {
            queue.playing = !queue.playing;
            queue.connection.dispatcher.pause(true);
            queue.textChannel.send(`${user} ⏸ поставил на паузу`)
            .then (queue => queue.delete({ timeout : 1500 }))
            .catch(console.error);
          } else {
            queue.playing = !queue.playing;
            queue.connection.dispatcher.resume();
            queue.textChannel.send(`${user} ▶ продолжил возпроизведение`)
            .then (queue => queue.delete({ timeout : 1500 }))
            .catch(console.error);
          }
          break;

        case "🔇":
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member)) return;
          if (queue.volume <= 0) {
            queue.volume = 30;
            queue.connection.dispatcher.setVolumeLogarithmic(queue.volume / 100);
            queue.textChannel.send(`${user} 🔊 включил звук`)
            .then (queue => queue.delete({ timeout : 1500 }));;
          } else {
            queue.volume = 0;
            queue.connection.dispatcher.setVolumeLogarithmic(0);
            queue.textChannel.send(`${user} 🔇 выключил звук`)
            .then (queue => queue.delete({ timeout : 1500 }));
          }
          break;

        case "🔉":
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member) || queue.volume == 0) return;
          if (queue.volume - 10 <= 0) queue.volume = 0;
          else queue.volume = queue.volume - 10;
          queue.connection.dispatcher.setVolumeLogarithmic(queue.volume / 100);
          queue.textChannel
            .send(`${user} 🔉 понизил громкость к ${queue.volume}%`)
            .then (queue => queue.delete({ timeout : 1500 }))
            .catch(console.error);
          break;

        case "🔊":
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member) || queue.volume == 100) return;
          if (Number(queue.volume) + 10 >= 100) queue.volume = 100;
          else queue.volume = Number(queue.volume) + 10;
          queue.connection.dispatcher.setVolumeLogarithmic(queue.volume / 100);
          queue.textChannel
            .send(`${user} 🔊 увеличил громкость к ${queue.volume}%`)
            .then (queue => queue.delete({ timeout : 1500 }))
            .catch(console.error);
          break;

        case "🔁":
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member)) return;
          queue.loop = !queue.loop;
          queue.textChannel.send(`повторение трека ${queue.loop ? "**включено**" : "**выключено**"}`)
          .then (queue => queue.delete({ timeout : 1500 }))
          .catch(console.error);
          break;

        case "⏹":
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member)) return;
          queue.songs = [];
          queue.textChannel.send(`${user} ⏹ остановил трек`)
          .then (queue => queue.delete({ timeout : 1500 }))
          .catch(console.error);
          try {
            queue.connection.dispatcher.end();
          } catch (error) {
            console.error(error);
            queue.connection.disconnect();
          }
          collector.stop();
          break;

        default:
          reaction.users.remove(user).catch(console.error);
          break;
      }
    });

    collector.on("end", () => {
      playingMessage.reactions.removeAll().catch(console.error);
      if (PRUNING && playingMessage && !playingMessage.deleted) {
        playingMessage.delete({ timeout: 3000 }).catch(console.error);
      }
    });
  }
};