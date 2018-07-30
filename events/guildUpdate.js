/* Craig (https://craig.chat/home/) developed by Yahweasel in 2018 under ISC License is used as a reference */

module.exports = (MFBAcvr, oldGuild, newGuild) => {
  try{
    if((oldGuild.region !== newGuild.region) && newGuild.voiceConnection){
      // The server's having moved their region causes to break the recording
      MFBAcvr.logger.log("Terminating the recording: Moved to another voice region");
      newGuild.voiceConnection.disconnect();
    }
  } catch(ex) {
    MFBAcvr.logger.error("CATCHED EX (guildUpdate): " + ex.stack + "");
  }
};