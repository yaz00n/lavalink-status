module.exports = {
  token: process.env.token || "", // Ensure this env variable is set
  channelId: process.env.channelId || "1408704855698182224",

  webMonitor: true, // Set to false if you don't want a website
  expressPort: process.env.expressPort || 3000,

  nodes: [
    {
      host: "5.39.63.207", // Your lavalink host address 
      password: "glace", // Your lavalink password
      port: 8262, // Your lavalink port
      identifier: "Nova Lounge lavalink", // Name for your lavalink
      secure: false, // set to true if your lavalink has SSL
      reconnectTimeout: 300000,
      reconnectTries: 100,
    },
    {
      host: "5.39.63.207",  
      password: "glace", 
      port: 8262, 
      identifier: "Nova Lounge lavalink",
      secure: false,
      reconnectTimeout: 300000,
      reconnectTries: 100,
    },
  ],
};
