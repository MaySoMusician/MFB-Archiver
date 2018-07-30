/* Craig (https://craig.chat/home/) developed by Yahweasel in 2018 under ISC License is used as a reference */

module.exports = (MFBAcvr, oldMember, newMember) => {
  let onVCSwitch = (member, toCnl, fromCnl) => {
    try{
      if(member.id === MFBAcvr.user.id){
        let gID = fromCnl.guild.id,
            cID = fromCnl.id;
        if(gID in MFBAcvr.recorder.activeRecs && cID in MFBAcvr.recorder.activeRecs[gID] && toCnl !== fromCnl){
          // Moving a channel causes to terminate a recording
          MFBAcvr.logger.log("Terminating the recording: Moved to another channel");
          member.guild.voiceConnection.disconnect();
        }
      }
    } catch(ex) {
      MFBAcvr.logger.error("CATCHED EX (onVCSwitch): " + ex.stack + "");
    }
  };
  
  if(oldMember.voiceChannel && newMember.voiceChannel && oldMember.voiceChannel.id !== newMember.voiceChannel.id){
    console.log("Switch 1");
    onVCSwitch(newMember, newMember.voiceChannel, oldMember.voiceChannel);
  } else if(oldMember.voiceChannel && !newMember.voiceChannel){
    console.log("Switch 2");
    onVCSwitch(oldMember, null, oldMember.voiceChannel);
  }
  
};