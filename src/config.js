module.exports = {
  token: process.env.token || "", // Ensure this env variable is set
  channelId: process.env.channelId || "", // Channel Id where the message is to be shown

  webMonitor: true, // Set to false if you don't want a website
  expressPort: process.env.expressPort || 3000,

  nodes: [
    {
      host: "your-lavalink-host.com", // Your lavalink host address 
      password: "your-password", // Your lavalink password
      port: 2333, // Your lavalink port
      identifier: "Node", // Name for your lavalink
      secure: false, // set to true if your lavalink has SSL
      reconnectTimeout: 300000,
      reconnectTries: 100,
    },
    {
      host: "",  
      password: "", 
      port: , 
      identifier: "",
      secure: false,
      reconnectTimeout: 300000,
      reconnectTries: 100,
    },
  ],
};
