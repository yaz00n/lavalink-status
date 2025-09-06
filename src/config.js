module.exports = {
  token: process.env.token || "", // Ensure this env variable is set
  channelId: process.env.channelId || "1412831816309669998",

  webMonitor: true, // Set to false if you don't want a website
  expressPort: process.env.expressPort || 3000,

  nodes: [
    {
      host: "193.226.78.187", // Your lavalink host address 
      password: "newgenstudio", // Your lavalink password
      port: 6473, // Your lavalink port
      identifier: "NewGen Studio Lavalink", // Name for your lavalink
      secure: false, // set to true if your lavalink has SSL
      reconnectTimeout: 300000,
      reconnectTries: 100,
    },
    {
      host: "193.226.78.187",  
      password: "newgenstudio", 
      port: 6473, 
      identifier: "NewGen Studio Lavalink",
      secure: false,
      reconnectTimeout: 300000,
      reconnectTries: 100,
    },
  ],
};
