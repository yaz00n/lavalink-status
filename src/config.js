module.exports = {
  token: process.env.token || "", // Your bot token
  channelId: process.env.channelId || "", //Channel Id where the message will be sent

  webMonitor: true, // Set to false if you don't want a  website
  expressPort: process.env.expressPort || 3000, // Port for website

  nodes: [
    {
      host: "", // Your lavalink host address 
      password: "", // Your lavalink password
      port: , // Your lavalink port
      identifier: "", // Name for your lavalink
      secure: false, // set too true if your lavalink has SSL
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
