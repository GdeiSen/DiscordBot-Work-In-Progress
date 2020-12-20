const { play } = require("../include/play");
const Discord = require("discord.js");
const ytdl = require("ytdl-core");
const YouTubeAPI = require("simple-youtube-api");
const scdl = require("soundcloud-downloader").default;
const https = require("https");
const { YOUTUBE_API_KEY, SOUNDCLOUD_CLIENT_ID, DEFAULT_VOLUME } = require("../util/EvobotUtil");
const youtube = new YouTubeAPI(YOUTUBE_API_KEY);

module.exports.run = async (client,message, args) => {
    
    const { channel } = message.member.voice;


    var embed1 = new Discord.MessageEmbed()
    .setTitle('ошибка')
    .setDescription('Для начала нужно быть в голосовом канале!')
    .setColor('RED')

    var embed2 = new Discord.MessageEmbed()
    .setTitle('ошибка')
    .setDescription('Вы должны быть в одинаковым канале с ботом!')
    .setColor('RED')

    let embed3 = new Discord.MessageEmbed()
    .setTitle('ошибка')
    .setDescription('Кажется у меня недостаточно прав для присоединения к вашему каналу!')
    .setColor('RED')

    let embed4 = new Discord.MessageEmbed()
    .setTitle('ошибка')
    .setDescription('Кажется у меня недостаточно прав для проигрывания музыки!')
    .setColor('RED')

    let embed5 = new Discord.MessageEmbed()
    .setTitle('ошибка')
    .setDescription('К сожалению ничего не нашлось!')
    .setColor('RED')

    let embed6 = new Discord.MessageEmbed()
    .setTitle('ошибка')
    .setDescription('Кажется что-то пошло не так!')
    .setColor('RED')

    let embed7 = new Discord.MessageEmbed()
    .setTitle('использование')
    .setDescription(`${message.client.prefix} play <YouTube URL | Video Name | Soundcloud URL>`)
    .setColor('ORANGE')

    const serverQueue = message.client.queue.get(message.guild.id);
    message.delete();
    if (!channel) return message.reply(embed1);
    if (serverQueue && channel !== message.guild.me.voice.channel)
      return message.reply(embed2).catch(console.error);

    if (!args.length)
      return message
        .reply(embed7)
        .catch(console.error);

    const permissions = channel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT"))
      return message.reply(embed3);
    if (!permissions.has("SPEAK"))
      return message.reply(embed4);

    const search = args;
    const videoPattern = /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.?be)\/.+$/gi;
    const playlistPattern = /^.*(list=)([^#\&\?]*).*/gi;
    const scRegex = /^https?:\/\/(soundcloud\.com)\/(.*)$/;
    const mobileScRegex = /^https?:\/\/(soundcloud\.app\.goo\.gl)\/(.*)$/;
    const url = args[0];
    const urlValid = videoPattern.test(args[0]);

    // Start the playlist if playlist url was provided
    if (!videoPattern.test(args[0]) && playlistPattern.test(args[0])) {
      return message.client.commands.get("playlist").run(bot,message, args);
    } else if (scdl.isValidUrl(url) && url.includes("/sets/")) {
      return message.client.commands.get("playlist").run(bot,message, args);
    }

    if (mobileScRegex.test(url)) {
      try {
        https.get(url, function (res) {
          if (res.statusCode == "302") {
            return message.client.commands.get("play").run(bot, message, [res.headers.location]);
          } else {
            return message.reply(embed5).catch(console.error);
          }
        });
      } catch (error) {
        console.error(error);
        return message.reply(error.message).catch(console.error);
      }
      return message.reply(embed6).catch(console.error);
    }

    const queueConstruct = {
      textChannel: message.channel,
      channel,
      connection: null,
      songs: [],
      loop: false,
      volume: DEFAULT_VOLUME || 30,
      playing: true
    };

    let songInfo = null;
    let song = null;

    if (urlValid) {
      try {
        songInfo = await ytdl.getInfo(url);
        song = {
          title: songInfo.videoDetails.title,
          url: songInfo.videoDetails.video_url,
          duration: songInfo.videoDetails.lengthSeconds
        };
      } catch (error) {
        console.error(error);
        return message.reply(error.message).catch(console.error);
      }
    } else if (scRegex.test(url)) {
      try {
        const trackInfo = await scdl.getInfo(url, SOUNDCLOUD_CLIENT_ID);
        song = {
          title: trackInfo.title,
          url: trackInfo.permalink_url,
          duration: Math.ceil(trackInfo.duration / 1000)
        };
      } catch (error) {
        console.error(error);
        return message.reply(error.message).catch(console.error);
      }
    } else {
      try {
        const results = await youtube.searchVideos(search, 1);
        songInfo = await ytdl.getInfo(results[0].url);
        song = {
          title: songInfo.videoDetails.title,
          url: songInfo.videoDetails.video_url,
          duration: songInfo.videoDetails.lengthSeconds
        };
      } catch (error) {
        console.error(error);
        return message.reply(error.message).catch(console.error);
      }
    }

    if (serverQueue) {
      serverQueue.songs.push(song);
      return serverQueue.textChannel
        .send(`✅ **${song.title}** успешно добавил ${message.author}`)
        .catch(console.error);
    }

    queueConstruct.songs.push(song);
    message.client.queue.set(message.guild.id, queueConstruct);

    try {
      queueConstruct.connection = await channel.join();
      await queueConstruct.connection.voice.setSelfDeaf(true);
      play(queueConstruct.songs[0], message);
    } catch (error) {
      console.error(error);
      message.client.queue.delete(message.guild.id);
      await channel.leave();
      return message.channel.send(` ${error}`).catch(console.error);
    }
  }

module.exports.config = {
  name: "play",
  cooldown: 3,
  aliases: ["p"],
  description: "Проигрывает песни с YouTube и <SoundCloud(в разработке)>",
}