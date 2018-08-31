const { version } = require("discord.js");
const moment = require("moment");
require("moment-duration-format");

exports.run = (MFBAcvr, message, args) => { // eslint-disable-line no-unused-vars
  const duration = moment.duration(MFBAcvr.uptime).format(" D [日] H [時間] m [分] s [秒]");
  message.channel.send(`= MFB-Archiver 統計 =
• メモリ使用量 :: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
• 稼働時間　　 :: ${duration}
• ユーザー数　 :: ${MFBAcvr.users.size.toLocaleString()}
• サーバー数　 :: ${MFBAcvr.guilds.size.toLocaleString()}
• チャンネル数 :: ${MFBAcvr.channels.size.toLocaleString()}
• Discord.js  :: v${version}
• Node        :: ${process.version}

= About MFB-Archiver =
MFB-Archiver is mainly developed by MaySoMusician, and is
available at https://github.com/MaySoMusician/MFB-Archiver
as an open-source project.
You can fix a bug or add a new feature you want by forking
the repository and sending a pull request from yours,
or report/discuss problems by opening a issue.

Recording & converting audio features are based on Craig,
the multi-track voice channel recording bot for Discord,
developed by Yahweasel in 2017-2018 licensed under ISC 
License, also available at
https://bitbucket.org/Yahweasel/craig as a open-source
project. Visit https://craig.chat/home/ if you'd like.
`, {code: "asciidoc"});
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "USR"
};

exports.help = {
  name: "info",
  category: "GENERAL",
  description: "Botに関する情報を表示します。",
  usage: "info"
};
