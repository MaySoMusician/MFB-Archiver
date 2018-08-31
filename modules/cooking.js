/* Craig (https://craig.chat/home/) developed by Yahweasel in 2018 under ISC License is used as a reference */

const cp = require("child_process"),
      fs = require("fs"),
      path = require("path"),
      moment = require("moment");
require("moment-duration-format");


module.exports = (MFBAcvr) => {
  MFBAcvr.cooker = {};
  MFBAcvr.cooker.cmds = {};
  
  MFBAcvr.cooker.cmds.cook = (rID) => {
    
    MFBAcvr.logger.log(`Started cooking the recording file [Recording ID: ${rID}]`);
    
    let output = fs.createWriteStream(`./data/rec/${rID}.zip`, {flags: "wx"}),
        errorOutput = fs.createWriteStream(`./data/rec/${rID}.cook.log`, {flags: "wx"});
    let cook;
    if (process.platform === 'win32'){
      // Windows Subsystem for Linux
      cook = cp.spawn("bash", ["./audio-cooker/cook.sh", rID], {
        cwd: path.dirname(require.main.filename),
        stdio: ["ignore", "pipe", "pipe"]
      });
    } else{
      cook = cp.spawn("./audio-cooker-cook.sh", [rID], {
        cwd: path.dirname(require.main.filename),
        stdio: ["ignore", "pipe", "pipe"]
      });
    }
    
    cook.stdout.pipe(output);
    cook.stderr.pipe(errorOutput);
    cook.on("exit", (code, signal) => {
      output.end();
      errorOutput.end();
      MFBAcvr.logger.log(`Finished cooking the recording file [Recording ID: ${rID}]`);
    });
  };
}