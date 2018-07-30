// This event executes when a new guild (server) is joined.

module.exports = (MFBAcvr, guild) => {
  MFBAcvr.logger.warn(`[GUILD JOIN] ${guild.name} (${guild.id}) Owner: ${guild.owner.user.tag} (${guild.owner.user.id})`);
};