exports.run = async (MFBAcvr, message, args) => {// eslint-disable-line no-unused-vars
  MFBAcvr.ready = false;
  //await MFBAcvr.wait(100);
  MFBAcvr.commands.forEach(async cmd => {
    await MFBAcvr.unloadCommand(cmd);
  });
  
  message.reply("停止できます").then(()=> {
    MFBAcvr.user.setStatus("invisible");
  });
  
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "OWN"
};

exports.help = {
  name: "die",
  category: "SYSTEM",
  description: "Botを終了待機状態にします。",
  usage: "die"
};
