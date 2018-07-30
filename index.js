// This will check if the node version you are running is the required Node version,
// if it isn't it will throw the following error to inform you.
if(process.version.slice(1).split(".")[0] < 8) throw new Error("Node 8.0.0 or higher is required. Update Node on your system.");

// Load up the discord.js library
const Discord = require("discord.js");

// Also load the rest of the things we need in this file:
const { promisify } = require("util");
const readdir = promisify(require("fs").readdir);
const Enmap = require("enmap");
const EnmapLevel = require("enmap-level");
const moment = require("moment");
require("moment-duration-format");

// Recording
const MFBAcvr = new Discord.Client({
  messageCacheLifetime: 21600,
  messageSweepInterval: 3600
});

// Reset flag of initialization
MFBAcvr.ready = false;

// Initialize console logger
MFBAcvr.logger = require("./utils/logger.js");

// Load common settings
MFBAcvr.config = require("./config.js");

// Load some useful functions, collection, etc.
require("./modules/functions.js")(MFBAcvr);

// Initialize Emojis
require("./modules/emojis.js")(MFBAcvr);

require("./modules/recording.js")(MFBAcvr);

// 内部処理用関数読み込み
//require("./modules/scheduler.js")(XPBot);

// タスクスケジューラー読み込み
//XPBot.db.taskScdDB.loadTasksNotYet();
// Commands are put in collections where they can be read from, catalogued, listed, etc.
MFBAcvr.commands = new Enmap();
// So aliases are
MFBAcvr.aliases = new Enmap(); 

// ******** OBSOLETED ********
// Now we integrate the use of Evie's awesome Enhanced Map module, which essentially saves a collection to disk.
// This is great for per-server configs, and makes things extremely easy for this purpose.
//MFBAcvr.settings = new Enmap({provider: new EnmapLevel({name: "settings"})});
// ******** OBSOLETED ********

// We're doing real fancy node 8 async/await stuff here, and to do that
// we need to wrap stuff in an anonymous function. It's annoying but it works.
const init = async () => {

  // Here we load **commands** into memory, as a collection, so they're accessible here and everywhere else.
  const cmdFiles = await readdir("./commands/");
  MFBAcvr.logger.log(`Loading a total of ${cmdFiles.length} commands...`);
  cmdFiles.forEach(f => {
    if(!f.endsWith(".js")) return; // if it's not js file, just ignore it.
    const response = MFBAcvr.loadCommand(f);
    if(response) console.log(response);
  });

  // Then we load events, which will include our message and ready event.
  const evtFiles = await readdir("./events/");
  MFBAcvr.logger.log(`Loading a total of ${evtFiles.length} events...`);
  evtFiles.forEach(file => {
    const eventName = file.split(".")[0];
    const event = require(`./events/${file}`);
    // This line is awesome by the way. Just sayin'.
    MFBAcvr.on(eventName, event.bind(null, MFBAcvr));
    const mod = require.cache[require.resolve(`./events/${file}`)];
    delete require.cache[require.resolve(`./events/${file}`)];
    for (let i = 0; i < mod.parent.children.length; i++) {
      if (mod.parent.children[i] === mod) {
        mod.parent.children.splice(i, 1);
        break;
      }
    }
  });

  // Generate a cache of client permissions for pretty perms
  MFBAcvr.levelCache = {};
  for (let i = 0; i < MFBAcvr.config.permLevels.length; i++) {
    const thisLevel = MFBAcvr.config.permLevels[i];
    MFBAcvr.levelCache[thisLevel.index] = thisLevel.level;
  }
  // Let's login!
  MFBAcvr.login(MFBAcvr.config.token);
  // End top-level async/await function.
};

init();


