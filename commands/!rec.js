exports.run = async (MFBAcvr, message, args) => { // eslint-disable-line no-unused-vars
  if(args[0] === "start"){
    if(message.member.voiceChannel){
      MFBAcvr.recorder.cmds.start(message.guild, message.member.voiceChannel);
    }
  } else if(args[0] === "stop"){
    MFBAcvr.recorder.cmds.stop(message.guild, message.member.voiceChannel);
  }

};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "OWN"
};

exports.help = {
  name: "!rec",
  category: "DEV",
  description: "Test",
  usage: "!rec"
};
