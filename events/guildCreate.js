// This event executes when a new guild (server) is joined.

module.exports = (MFBAcvr, guild) => {
  MFBAcvr.logger.warn(`|MFBAcvr| [GUILD JOIN] ${guild.name} (${guild.id}) Owner: ${guild.owner.user.tag} (${guild.owner.user.id})`);
};