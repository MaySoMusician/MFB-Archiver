exports.run = async (MFBAcvr, message, args) => {// eslint-disable-line no-unused-vars
  MFBAcvr.ready = false;
  //await MFBAcvr.wait(100);
  let msgDying = await message.reply("再起動します");
  
  MFBAcvr.commands.forEach(async cmd => {
    await MFBAcvr.unloadCommand(cmd);
  });
  
  msgDying.delete().then(()=> {
    MFBAcvr.user.setStatus("invisible");
    process.exit(1);
  });
  
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["reb"],
  permLevel: "OWN"
};

exports.help = {
  name: "reboot",
  category: "SYSTEM",
  description: "Botをシャットダウンします。PM2環境では自動的に再起動します。",
  usage: "reboot"
};
