/* Craig (https://craig.chat/home/) developed by Yahweasel in 2018 under ISC License is used as a reference */

const cp = require("child_process"),
      fs = require("fs"),
      ogg = require("./oggEncoder.js"),
      opus = new (require("node-opus")).OpusEncoder(48000),
      emptyBuf = Buffer.alloc(0),
      sodium = require("libsodium-wrappers"),
      moment = require("moment");
require("moment-duration-format");

// A precomputed Opus header, made by node-opus 
const opusHeader = [
  Buffer.from([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64, 0x01, 0x02,
               0x00, 0x0f, 0x80, 0xbb, 0x00, 0x00, 0x00, 0x00, 0x00]),
  Buffer.from([0x4f, 0x70, 0x75, 0x73, 0x54, 0x61, 0x67, 0x73, 0x09, 0x00,
               0x00, 0x00, 0x6e, 0x6f, 0x64, 0x65, 0x2d, 0x6f, 0x70, 0x75, 0x73, 0x00,
               0x00, 0x00, 0x00, 0xff])
];

module.exports = (MFBAcvr) => {
  MFBAcvr.recorder = {};
  MFBAcvr.recorder.cmds = {};
  
  MFBAcvr.recorder.activeRecs = {};
  
  const session = (rec) => {
    // 'rec' is an object containing several items
    let connection = rec.connection,
        id = rec.id,
        receiver = connection.createReceiver();

    // Ping the voice websocket to check if it stays alive
    /*connection.sockets.ws.alive = true;
    connection.sockets.ws.on("pong", () => {
      this.alive = true;
    });
    const pingLoop = setInterval(() => {
      if(!connection.sockets.ws.alive){
        connection.disconnect();
      } else{
        connection.sockets.ws.alive = false;
        connection.sockets.ws.ping();
      }
    }, 30000); // once 30 secs*/

    // TODO: indicate the bot is recording

    MFBAcvr.logger.log(`Started recording at ${connection.channel.name} in ${connection.channel.guild.name} [Recording ID: ${id}]`);

    // [Emit start event?]

    let users = {}, // Active users
        userTrackNos = {}, // Track numbers for each active user
        userPacketNos = {}, // Packet numbers for each active user
        userRecentPackets = {}, // Recent packets, before they've been flushed, for each active user
        corruptWarn = {}; // Have we warned about this user's data being corrupt?

    // Our currenct track number
    let trackNo = 1;

    // Set up the recording OGG header and data file
    let startTime = process.hrtime();
    let recFilePathBase = "data/rec/" + id + ".ogg";

    // The amount of data the bot has recorded
    let size = 0;

    // Keep track and disconnect whether the bot seems to be unused
    let lastSize = 0,
        usedMins = 0,
        unusedMins = 0,
        warned = false;
    const silenceCheckerLoop = setInterval(() => {
      if(size != lastSize){ // If anyone has seemed to be speaking
        lastSize = size;
        usedMins++;
        unusedMins = 0;
      } else{
        unusedMins++;
        if(usedMins === 0){ // There's no recording
          if(rec.noSilenceDisconnect){
            usedMins++; // Just to make this warning not resound
          } else{
            MFBAcvr.logger.log(`Stop recording (Nobody has spoken) [Recording ID: ${id}]`);
            rec.disconnected = true;
            connection.disconnect();
            return;
          }
        } else if(unusedMins === 5 && !warned){
          MFBAcvr.logger.warn(`Nothing is heard for a while [Recording ID: ${id}]`);
          warned = true;
        }
      }
    }, 60000); // once 1 min

    // Indicate whether or not the bot is hearing anything, by glowing its icon
    let lastTime = [0, 0];
    const feedbackLoop = setInterval(() => {
      let curTime = process.hrtime(startTime),
          diff = ((curTime[0] - lastTime[0]) * 10 + (curTime[1] - lastTime[1]) / 100000000);
      if(diff > 10){ // If it's been more than 1 sec since the bot heard anything
        connection.setSpeaking(false);
      }
    }, 1000); // once 1 sec

    // Set up the recording streams
    let recHeaderFStream = [fs.createWriteStream(recFilePathBase + ".header1"), fs.createWriteStream(recFilePathBase + ".header2")], // File streams of header
        recDataFStream = fs.createWriteStream(recFilePathBase + ".data"), // File stream of recording data
        recUserFStream = fs.createWriteStream(recFilePathBase + ".users"); // File stream of speaking users
    recUserFStream.write(`"0":{}\n`);

    // OGG Encoder
    let write = (stream, granulePos, streamNo, packetNo, chunk, flags) => {
      size += chunk.length;
      stream.write(granulePos, streamNo, packetNo, chunk, flags);
    };

    let recHeaderOggStream = [new ogg.OggEncoder(recHeaderFStream[0]), new ogg.OggEncoder(recHeaderFStream[1])], // Ogg stream of header
        recOggStream = new ogg.OggEncoder(recDataFStream), // Ogg stream of recording data
        recOgg2Stream; // 2nd Ogg stream of recording data

    // Encoding a single Opus chunk to an ogg file
    let encodeChunk = (user, oggStream, streamNo, packetNo, chunk) => {
      let chunkGranule = chunk.time;

      // Old Method
      /*if(chunk.length > 4 && chunk[0] === 0xbe && chunk[1] === 0xde){ // When there is an RTP header extension
        let rtpHLen = chunk.readUInt16BE(2),
            offset = 4;

        for(let rhs = 0; rhs < rtpHLen && offset < chunk.length; rhs++){
          let subLen = (chunk[offset] & 0xf) + 2;
          offset += subLen;
        }
        while (offset < chunk.length && chunk[offset] === 0) offset++;
        if(offset >= chunk.length) offset = chunk.length;

        chunk = chunk.slice(offset);
      }*/
      
      if(chunk.length > 4 && chunk[0] === 0xbe && chunk[1] === 0xde){ // When there is an RTP header extension
        let rtpHLen = chunk.readUInt16BE(2),
            offset = 4;

        for(let rhs = 0; rhs < rtpHLen; rhs++){
          const byte = chunk[offset];
          offset++;
          if(byte === 0) continue;
          offset += 1 + (0b1111 & (byte >> 4));
        }
        while (chunk[offset] === 0) offset++;
        //if(offset >= chunk.length) offset = chunk.length;

        chunk = chunk.slice(offset);
      }

      // Occasionally check if it's valid Opus data
      if(packetNo % 50 === 49){
        try {
          opus.decode(chunk, 960);
        } catch(ex){
          if(!corruptWarn[user.id]){
            MFBAcvr.logger.warn(`Corrupt Opus data [Recording ID: ${id} | User: ${user.tag}(${user.id})]`);
            corruptWarn[user.id] = true;
          }
        }
      }

      // Write out the chunk itself
      write(oggStream, chunkGranule, streamNo, packetNo, chunk);
      // Write the timestamp for reference
      write(oggStream, chunk.timestamp ? chunk.timestamp : 0, streamNo, packetNo + 1, emptyBuf);
    };

    // Flushing one/more packets from a user's recent queue
    let flush = (user, oggStream, streamNo, queue, ct) => {
      let packetNo = userPacketNos[user.id];
      for(let i = 0; i < ct; i++){
        let chunk = queue.shift();
        try{
          encodeChunk(user, oggStream, streamNo, packetNo, chunk);
          packetNo += 2;
        } catch(ex) {
          MFBAcvr.logger.error("CATCHED EX (flush): " + ex.stack + "");
        }
      }
      userPacketNos[user.id] = packetNo;
    };

    // Receiver for the actual data
    let onReceive = (user, chunk) => {
      // By default, chunk.time is the receipt time
      let chunkTime = process.hrtime(startTime);
      chunk.time = chunkTime[0] * 48000 + ~~(chunkTime[1] / 20833.333); // ~~ is a operator of rounding off

      // Indicate the bot is now receiving
      lastTime = chunkTime;
      connection.setSpeaking(true);

      // Check if the bot is prepared for this user
      let userTrackNo, userRecents;
      if(!(user.id in users)){
        users[user.id] = user;
        userTrackNo = trackNo++;
        userTrackNos[user.id] = userTrackNo;
        userPacketNos[user.id] = 2;
        userRecents = userRecentPackets[user.id] = [];

        // Put a valid Opus header at the beginning
        try{
          write(recHeaderOggStream[0], 0, userTrackNo, 0, opusHeader[0], ogg.BOS);
          write(recHeaderOggStream[1], 0, userTrackNo, 1, opusHeader[1]);
        } catch(ex){
          MFBAcvr.logger.error("CATCHED EX (onReceive 1): " + ex.stack + "");
        }

        let logUserData = (user) => {
          let data = {
            id: user.id,
            tag: user.tag
          };
          try{
            recUserFStream.write(`,"${userTrackNo}":${JSON.stringify(data)}\n`);
          } catch(ex){
            MFBAcvr.logger.error("CATCHED EX (logUserData): " + ex.stack + "");
          }
        };

        // Remember this user's name
        if(user.unknown){
          try{
            connection.channel.guild.fetchMembers().then(g => { // Firstly fetch all the members
              let m;
              try {
                m = g.members.get(user.id);
              } catch(ex) {} // just ignore it
              if(m) logUserData(m.user);
              else logUserData(user);
            });
          } catch(ex){
            logUserData(user);
          }
        } else{
          logUserData(user);
        }
      } else{
        userTrackNo = userTrackNos[user.id];
        userRecents = userRecentPackets[user.id];
      }

      // Add it to the list
      if(userRecents.length > 0){
        let last = userRecents[userRecents.length - 1];
        userRecents.push(chunk);
        if(last.timestamp > chunk.timestamp){ // if received out of order
          userRecents.sort((a, b) => a.timestamp - b.timestamp);
          /* Note: due to this reordering, the granule position in the output ogg file will actually be decreasing.
           * This is fine for us, as all ogg files are preprocessed by oggstender, which corrects such discrepancies anyway. */
        }
      } else{
        userRecents.push(chunk);
      }

      if(userRecents.length >= 16) flush(user, recOggStream, userTrackNo, userRecents, 1); // If the list is getting long, flush it
    };

    /* Handling receiving a packet
     * cf. https://github.com/abalabahaha/eris/blob/master/lib/voice/VoiceConnection.js#L626
     *     https://github.com/discordjs/discord.js/blob/stable/src/client/voice/receiver/VoiceReceiver.js#L148
     */
    let newHandlePacket = (msg, user) => {
      let nonce = Buffer.alloc(24),
          userID;
      if(user) userID = user.id;
      else userID = '00000000';
          //userID = user.id;
      nonce.fill(0);
      msg.copy(nonce, 0, 0, 12);
      let chunk = sodium.crypto_secretbox_open_easy(msg.slice(12), nonce, connection.authentication.secretKey.key);
      if(!chunk){
        MFBAcvr.logger.error(`Failed to decrypt voice packet [Recording ID: ${id} | User ID: ${userID}]`);
        return;
      }
      chunk = Buffer.from(chunk);
      chunk.timestamp = nonce.readUIntBE(4, 4);
      // timestamp = nonce.readUIntBE(4, 4);
      // emit data event (chunk, user, timestamp)
      
      if(!user){ // If it's weird data, log it to the extra file
        user = {
          id: userID,
          tag: "UNKNOWN#0000",
          unknown: true
        };
        try{
          if(!recOgg2Stream) recOgg2Stream = new ogg.OggEncoder(fs.createWriteStream(recFilePathBase + ".data2"));
          let chunkTime = process.hrtime(startTime);
          chunk.time = chunkTime[0] * 48000 + ~~(chunkTime[1] / 20833.333); // ~~ is a operator of rounding off
          encodeChunk(user, recOgg2Stream, 0, 0, chunk);
        } catch(ex){
          MFBAcvr.logger.error("CATCHED EX (Ogg2Stream): " + ex.stack + "");
        }
        return;
      }
      return onReceive(user, chunk);
    };

    /* Listening UDP socket messages 
     * cf. https://github.com/discordjs/discord.js/blob/stable/src/client/voice/receiver/VoiceReceiver.js#L44
     */
    connection.sockets.udp.socket.on("message", (msg) => {
      let ssrc = +msg.readUInt32BE(8).toString(10);
      let user = connection.ssrcMap.get(ssrc);
      if(user){
        if(receiver.queues.get(ssrc)) receiver.queues.get(ssrc).map(m => newHandlePacket(m, user));
        else newHandlePacket(msg, user);
      }
    });

    // When the bot is disconnected from the channel
    let disconnected = false;
    let onDisconnect = () => {
      if(disconnected) return; // If already disconnected
      disconnected = true;

      // Flush any remaining data
      for(let uid in userRecentPackets){
        let user = users[uid],
            userTrackNo = userTrackNos[uid],
            userRecents = userRecentPackets[uid];
        flush(user, recOggStream, userTrackNo, userRecents, userRecents.length);
      }

      if(!rec.disconnected){ // When this is unintentional
        MFBAcvr.logger.error(`Unexpected disconnect from ${connection.channel.name} in ${connection.channel.guild.name} [Recording ID: ${id}]`);
        rec.disconnected = true;
      }

      MFBAcvr.logger.log(`Finished recording at ${connection.channel.name} in ${connection.channel.guild.name} [Recording ID: ${id}]`);

      // [Emit stop event?]

      // Close the output files
      recHeaderOggStream[0].end();
      recHeaderOggStream[1].end();
      recOggStream.end();
      if(recOgg2Stream) recOgg2Stream.end();
      recUserFStream.end();
      
      //clearInterval(pingLoop);
      clearInterval(silenceCheckerLoop);
      clearInterval(feedbackLoop)

      // Destroy the receiver (unnecessary)
      try{
        receiver.destroy();
      } catch(ex) {} // Just ignore it


      // [Start finalization of recording?]
      MFBAcvr.cooker.cmds.cook(id);

      // Callback
      rec.close();

    };

    connection.on("disconnect", onDisconnect);
    connection.on("error", onDisconnect);

    connection.on("warn", (warning) => {
      if(rec.disconnected) return;
      MFBAcvr.logger.warn(`VoiceConnection at ${connection.channel.name} in ${connection.channel.guild.name} warns: ${warning} [Recording ID: ${id}]`);
    });
  };

  // Joining a voice channel, against bugs of Discord.js
  const safeJoin = (cnl, err) => {
    let g = cnl.guild;
    let catchConnection = () => {
      if(g.voiceConnection) {
        g.voiceConnection.on("error", (ex) => {
          try{
            g.client.voiceConnections.delete(g.id);
          } catch(noex) {}
          if(err) err(ex);
        });
        clearInterval(interval);
      }
    }
    let cnc = cnl.join();
    let interval = setInterval(catchConnection, 200);
    return cnc;
  };
  
  // options = {noSilenceDisconnect}
  //MFBAcvr.recorder.cmds.start = (guild, channel, {noSilenceDisconnect = false}) => {
  MFBAcvr.recorder.cmds.start = async (guild, channel, noSilenceDisconnect = false) => {
    if(!guild){
      MFBAcvr.logger.error(`Record Starting | Invalid guild (initial checking): '${guild}'`);
      return;
    }
    
    if(!channel){
      MFBAcvr.logger.error(`Record Starting | Invalid channel (initial checking): '${channel}'`);
      return;
    }
    
    let gID = guild.id,
        cID = channel.id;
    if(!(gID in MFBAcvr.recorder.activeRecs)) MFBAcvr.recorder.activeRecs[gID] = {};
    
    /*if(user.bot){
      MFBAcvr.logger.error(`Invalid user (bot client): ${uID}`);
      return;
    }*/
    
    // Joinable can crash if the voiceConnection is in a weird state
    let joinable = true;
    try{
      joinable = channel.joinable;
    } catch(ex) {
      // Work around the most insane Discord.js bug
      try{
        let fguild = MFBAcvr.guilds.get(gID);
        if(fguild){
          guild = fguild;
          let fchannel = guild.channels.get(channel.id);
          if(fchannel) channel = fchannel;
          channel.guild = guild;
        }
        joinable = channel.joinable;
      } catch(ex){
        if(channel) MFBAcvr.logger.error(`Record Starting | Failed to get the value of joinable of '${channel.name}' (${channel.id})`);
        else MFBAcvr.logger.error(`Record Starting | Failed to get the value of joinable: unknown channel (the passed ID is ${channel.id} )`);
      }
    }
    
    if(cID in MFBAcvr.recorder.activeRecs[gID]){ // When recording has already started
      let rec = MFBAcvr.recorder.activeRecs[gID][cID];
      MFBAcvr.logger.error(`Record Starting | Already started at ${channel.name} in ${guild.name} [Recording ID: ${rec.id}]`);
    } else if(!guild){
      MFBAcvr.logger.error(`Record Starting | Invalid guild (eve checking): '${guild}'`);
    } else if(!channel){
      MFBAcvr.logger.error(`Record Starting | Invalid channel (eve checking): '${channel}'`);
    } else if(!joinable){
      MFBAcvr.logger.error(`Record Starting | Can't join ${channel.name} in ${guild.name}: insufficient permission`);
    } else{ // Now the bot is going to start to record
      let startMoment, id, infoWS; // Write stream for information
      while(true){
        startMoment = moment();
        id = parseInt(startMoment.format("YYMMDDHHmmss"));
        try{
          infoWS = fs.createWriteStream("data/rec/" + id + ".ogg.info", {flags: "wx"});
          break;
        } catch(ex){ // When ID existed, just try again
          await MFBAcvr.wait(1000); // wait 1 min for ID renewal
        }
      }
      
      let recFilePathBase = "data/rec/" + id + ".ogg";
      
      //Set up the info
      let info = {
        guild: guild.name + "#"+ guild.id,
        channel: channel.name + "#" + channel.id,
        startTime: startMoment.format("YYYY-MM-DD HH:mm:ss")
      };
      
      // Write out the info
      infoWS.write(JSON.stringify(info));
      infoWS.end();
      
      let closed = false;
      let close = () => {
        if(closed) return; // If connection already closed
        
        closed = true;
        
        // Now throw it away
        delete MFBAcvr.recorder.activeRecs[gID][cID];
        if(Object.keys(MFBAcvr.recorder.activeRecs[gID]).length === 0) delete MFBAcvr.recorder.activeRecs[gID];
        
        // Try to reset the voice connection by swiching to another channel
        let diffCnl = channel;
        guild.channels.some((maybeCnl) => {
          if(maybeCnl === channel) return false; // you're not wanted
          
          let joinable = false;
          try{ joinable = maybeCnl.joinable } catch(ex){}
          if(!joinable) return false; // I don't want the one unwelcomeing me
          diffCnl = maybeCnl;
          return true;
        });
        let leave = () => { setTimeout(() => {try{ diffCnl.leave(); } catch(ex){} }, 1000);};
        safeJoin(diffCnl, leave).then(leave).catch(leave);
      };
      
      let rec = {
        info: info,
        connection: null,
        id: id,
        disconnected: false,
        close: close
      };
      
      MFBAcvr.recorder.activeRecs[gID][cID] = rec;
      
      if(noSilenceDisconnect) rec.noSilenceDisconnect = true;
      
      let onJoinError = (ex) => {
        MFBAcvr.logger.error(`Record Starting | Failed to join ${channel.name} in ${guild.name} [Recording ID: ${id}]`);
        console.error(ex);
        close();
      };
      
      // Join the VC
      safeJoin(channel, onJoinError).then((cnc) => {
        rec.connection = cnc;
        session(rec);
      }).catch(onJoinError);
      
      // If the bot doesn't have a connection in 15 secs, assume something went wrong
      setTimeout(() => { if(!rec.connection) close(); }, 15000); // After 15 secs
    }
  };
  
  MFBAcvr.recorder.cmds.stop = async (guild, channel) => {
    if(!guild){
      MFBAcvr.logger.error(`Record Stopping | Invalid guild (initial checking): '${guild}'`);
      return;
    }

    if(!channel){
      MFBAcvr.logger.error(`Record Stopping | Invalid channel (initial checking): '${channel}'`);
      return;
    }
    
    let gID = guild.id,
        cID = channel.id;
    if((gID in MFBAcvr.recorder.activeRecs) && !(cID in MFBAcvr.recorder.activeRecs[gID])){
      let rid = Object.keys(MFBAcvr.recorder.activeRecs[gID])[0];
      if(rid){
        channel = guild.channels.get(rid);
        cID = rid;
      }
    }
    if(gID in MFBAcvr.recorder.activeRecs && cID in MFBAcvr.recorder.activeRecs[gID]){
      try{
        let rec = MFBAcvr.recorder.activeRecs[gID][cID];
        if(rec.connection){
          rec.disconnected = true;
          rec.connection.disconnect();
        }
      } catch(ex){
        MFBAcvr.logger.error("CATCHED EX (Record Stopping): " + ex.stack + "");
      }
    }
  };
  
}