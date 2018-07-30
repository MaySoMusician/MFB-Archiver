module.exports = async MFBAcvr => {
  // Log that the bot is online.
  MFBAcvr.logger.log(`${MFBAcvr.user.tag}, ready to serve ${MFBAcvr.users.size} users in ${MFBAcvr.guilds.size} servers.`, "RDY");

  //MFBAcvr.user.setActivity(`${MFBGB.config.prefix}help`, {type: "PLAYING"});
  
  MFBAcvr.ready = true;
};