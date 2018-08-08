# MFB-Archiver

MFB-Archiver records the MFB radio programs on Discord, fetching Opus stream data from Discord and converting it into Ogg or other formats.

## Installation

**Note:** This Discord bot is optimized for the MFB server, so when you use it for the purpose of saving your own podcast/let's plays/radio, you will have to alter it for your server by yourself.

### Requirements

- Node.js (v8.0 or higher)
- Discord.js and other dependencies
- FFmpeg and other encoders you want to use

### How To Setup

1. Install node.js (v8.0 or higher) and npm, then prepare a new Discord application at https://discordapp.com/developers/applications/me
2. Clone or download this repositry.
3. Install the dependencies by executing `npm install`.
4. Copy `config.js.sample` in the root directory and rename it to `config.js`.
5. Fill in `ownerID`, `token`, `logGuild`. You can change other settings the way you want.
6. Run it by `node index.js`.

As previously mentioned you will have to change the program for running on your environment.

## License

MFB-Archiver is licensed under MIT License.

MFB-Archiver is based on [AnIdiotsGuide/guidebot](https://github.com/AnIdiotsGuide/guidebot) by [York](https://github.com/YorkAARGH) licensed under MIT License.

The following files originally developed for [Craig](https://craig.chat/home/) by [Yahweasel](https://www.yahweasel.com/) in 2017-2018 are licensed under ISC License. Thank him very much.

- [/audio-cooker/src/oggduration.c](audio-cooker/src/oggduration.c)
- [/audio-cooker/src/oggmultiplexer.c](audio-cooker/src/oggmultiplexer.c)
- [/audio-cooker/src/oggstender.c](audio-cooker/src/oggstender.c)
- [/audio-cooker/src/wavduration.c](audio-cooker/src/wavduration.c)
- [/audio-cooker/cook.sh](audio-cooker/cook.sh)
- [/audio-cooker/oggduration](audio-cooker/oggduration)
- [/audio-cooker/oggmultiplexer](audio-cooker/oggmultiplexer)
- [/audio-cooker/oggstender](audio-cooker/oggstender)
- [/audio-cooker/recinfo.js](audio-cooker/recinfo.js)
- [/audio-cooker/userinfo.js](audio-cooker/userinfo.js)
- [/audio-cooker/wavduration](audio-cooker/wavduration)
- [/events/guildUpdate.js](events/guildUpdate.js) (partialy)
- [/events/voiceStateUpdate.js](events/voiceStateUpdate.js) (partialy)
- [/modules/oggEncoder.js](modules/oggEncoder.js)
- [/modules/recording.js](modules/recording.js)

The original files are available at https://bitbucket.org/Yahweasel/craig/
