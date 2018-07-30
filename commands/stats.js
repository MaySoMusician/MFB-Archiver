const { version } = require("discord.js");
const moment = require("moment");
require("moment-duration-format");

exports.run = (MFBAcvr, message, args) => { // eslint-disable-line no-unused-vars
  const duration = moment.duration(MFBAcvr.uptime).format(" D [日], H [時間], m [分], s [秒]");
  message.channel.send(`= MFB-Archiver 統計 =
• メモリ使用量 :: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
• 稼働時間　　 :: ${duration}
• ユーザー数　 :: ${MFBAcvr.users.size.toLocaleString()}
• サーバー数　 :: ${MFBAcvr.guilds.size.toLocaleString()}
• チャンネル数 :: ${MFBAcvr.channels.size.toLocaleString()}
• Discord.js  :: v${version}
• Node        :: ${process.version}`, {code: "asciidoc"});
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "USR"
};

exports.help = {
  name: "stats",
  category: "GENERAL",
  description: "Botに関する統計を表示します。",
  usage: "stats"
};
