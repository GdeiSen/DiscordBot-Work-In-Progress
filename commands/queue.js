const { MessageEmbed } = require("discord.js");


module.exports.run = async(bot,message,args)=> {
    var embed1 = new MessageEmbed()
    .setTitle('ошибка')
    .setDescription('**Ничего не воспроизводится**')
    .setColor('RED')

    let embed4 = new MessageEmbed()
    .setTitle('ошибка')
    .setDescription('Кажется у меня недостаточно прав для проигрывания музыки!')
    .setColor('RED')
    
    const permissions = message.channel.permissionsFor(message.client.user);
    if (!permissions.has(["MANAGE_MESSAGES", "ADD_REACTIONS"]))
      return message.reply(embed4);

    const queue = message.client.queue.get(message.guild.id);
    if (!queue) return message.channel.send(embed1);

    let currentPage = 0;
    const embeds = generateQueueEmbed(message, queue.songs);

    const queueEmbed = await message.channel.send(
      `**страница - ${currentPage + 1}/${embeds.length}**`,
      embeds[currentPage]
    );

    try {
      await queueEmbed.react("⬅️");
      await queueEmbed.react("⏹");
      await queueEmbed.react("➡️");
    } catch (error) {
      console.error(error);
      message.channel.send(error.message).catch(console.error);
    }

    const filter = (reaction, user) =>
      ["⬅️", "⏹", "➡️"].includes(reaction.emoji.name) && message.author.id === user.id;
    const collector = queueEmbed.createReactionCollector(filter, { time: 60000 });

    collector.on("collect", async (reaction, user) => {
      try {
        if (reaction.emoji.name === "➡️") {
          if (currentPage < embeds.length - 1) {
            currentPage++;
            queueEmbed.edit(`**страница - ${currentPage + 1}/${embeds.length}**`, embeds[currentPage]);
          }
        } else if (reaction.emoji.name === "⬅️") {
          if (currentPage !== 0) {
            --currentPage;
            queueEmbed.edit(`**страница - ${currentPage + 1}/${embeds.length}**`, embeds[currentPage]);
          }
        } else {
          collector.stop();
          reaction.message.reactions.removeAll();
        }
        await reaction.users.remove(message.author.id);
      } catch (error) {
        console.error(error);
        return message.channel.send(error.message).catch(console.error);
      }
    });
  }
;

function generateQueueEmbed(message, queue) {
  let embeds = [];
  let k = 10;

  for (let i = 0; i < queue.length; i += 10) {
    const current = queue.slice(i, k);
    let j = i;
    k += 10;

    const info = current.map((track) => `${++j} - [${track.title}](${track.url})`).join("\n");

    const embed = new MessageEmbed()
      .setTitle("Очередь\n")
      .setThumbnail(message.guild.iconURL())
      .setColor('GREEN')
      .setDescription(`**сейчас играет - [${queue[0].title}](${queue[0].url})**\n\n${info}\nиспользуйте кнопки для перемещения по страницам`)
      .setTimestamp();
    embeds.push(embed);
  }

  return embeds;
}

module.exports.config = {
  name: "queue",
  usage: "~queue",
  description: "Выводит состояние цекущей очереди",
  accessableby: "Members",
  aliases: ['q']
}