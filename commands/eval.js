// The EVAL command will execute **ANY** arbitrary javascript code given to it.
// THIS IS PERMISSION LEVEL 9 FOR A REASON!
// It's perm level 9 because eval can be used to do **anything** on your machine,
// from stealing information to purging the hard drive. DO NOT LET ANYONE ELSE USE THIS

exports.run = async (MFBAcvr, message, args) => { // eslint-disable-line no-unused-vars
  const code = args.join(" ");
  try {
    const evaled = eval(code);
    const clean = await MFBAcvr.clean(MFBAcvr, evaled);
    message.channel.send(`\`\`\`js\n${clean}\n\`\`\``);
  } catch (err) {
    message.channel.send(`\`ERROR\` \`\`\`xl\n${await MFBAcvr.clean(MFBAcvr, err)}\n\`\`\``);
  }
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "OWN"
};

exports.help = {
  name: "eval",
  category: "SYSTEM",
  description: "任意のJavascriptコードを実行します。",
  usage: "eval [...コード]"
};
