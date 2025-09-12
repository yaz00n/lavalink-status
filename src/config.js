module.exports = {
  token: process.env.token || "", // Ensure this env variable is set
  channelId: process.env.channelId || "1412831816309669998",

  webMonitor: true, // Set to false if you don't want a website
  expressPort: process.env.expressPort || 3000,

  nodes: [
    {
      host: "194.58.66.44", // Your lavalink host address 
      password: "newgenstudio", // Your lavalink password
      port: 6284, // Your lavalink port
      identifier: "NewGen Studio Node 1", // Name for your lavalink
      secure: false, // set to true if your lavalink has SSL
      reconnectTimeout: 300000,
      reconnectTries: 100,
    },
    {
      host: "fi2.bot-hosting.net",  
      password: "newgenstudio", 
      port: 21408, 
      identifier: "NewGen Studio Node 2",
      secure: false,
      reconnectTimeout: 300000,
      reconnectTries: 100,
    },
  ],
};
