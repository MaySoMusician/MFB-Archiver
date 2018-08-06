/* Craig (https://craig.chat/home/) developed by Yahweasel in 2018 under ISC License is used as a reference */

const crc32 = require("cyclic-32");

// Flags for all ogg
const BOS = 2, // Beginning of Stream
      EOS = 4; // End of Streamg
exports.BOS = BOS;
exports.EOS = EOS;

function OggEncoder(fstream){
  this.fstream = fstream;
}

exports.OggEncoder = OggEncoder;

OggEncoder.prototype.write = function(granulePos, streamNo, packetNo, chunk, flags){
  // The number of bytes required to explain this chunk
  let lengthBytes = Math.ceil(chunk.length / 255) + 1;
  
  // Total length of header
  let headerBytes = 26 + lengthBytes,
      header = Buffer.alloc(headerBytes + chunk.length);
  
  // Byte 0: Initial header
  header.write("OggS");
  
  // Byte 4: Stream structure 0
  
  // Byte 5: Flags
  if(typeof flags === "undefined") flags = 0;
  header.writeUInt8(flags, 5);
  
  // Byte 6: Granule position
  header.writeUIntLE(granulePos, 6, 6);
  
  // Byte 14: Stream serial number
  header.writeUInt32LE(streamNo, 14);
  
  // Byte 18: Page sequence number
  header.writeUInt32LE(packetNo, 18);
  
  // Byte 22: CRC-32 (ckecksum), calculated in later
  
  // Byte 26: The number of segments
  header.writeUInt8(lengthBytes - 1, 26);
  
  // And the segment lengths themselves
  let i = 27;
  if(chunk.length) {
    let r = chunk.length;
    while(r > 255){
      header.writeUInt8(255, i++);
      r -= 255;
    }
    header.writeUInt8(r, i);
  }
  
  // Add the actual data
  chunk.copy(header, headerBytes);
  chunk = header;
  
  // Calculate checksum
  chunk.writeInt32LE(crc32(chunk), 22);
  
  // Finally write it out
  this.fstream.write(chunk);
};

OggEncoder.prototype.end = function(){
  this.fstream.end();
};