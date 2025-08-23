module.exports = {
  token: process.env.token || "", // Ensure this env variable is set
  channelId: process.env.channelId || "1408704855698182224",

  webMonitor: true, // Set to false if you don't want a website
  expressPort: process.env.expressPort || 3000,

  nodes: [
    {
      host: "193.226.78.187", // Your lavalink host address 
      password: "novaloungehost", // Your lavalink password
      port: 4833, // Your lavalink port
      identifier: "Nova Lounge lavalink", // Name for your lavalink
      secure: false, // set to true if your lavalink has SSL
      reconnectTimeout: 300000,
      reconnectTries: 100,
    },
    {
      host: "",  
      password: "", 
      port: 0, 
      identifier: "",
      secure: false,
      reconnectTimeout: 300000,
      reconnectTries: 100,
    },
  ],
};
