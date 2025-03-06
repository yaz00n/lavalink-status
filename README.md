<h1 align="center">Lavalink Status Monitor</h1>

<p align="center"><strong>Note:</strong> This monitor only supports Lavalink v4. Lavalink v3 is no longer maintained</p>

## Installation / Hosting Guide

1. **Ensure NodeJS v18 or Later**:
    - Make sure your NodeJS version is 18 or later.

2. **Clone the Repository**:
    - Clone the repository or download the ZIP file:
    ```sh
    git clone https://github.com/gaurav87565/Lavalink-status.git
    ```

3. **Configure the Bot**:
    - Fill in the [config.js](https://github.com/gaurav87565/Lavalink-status/blob/main/src/config.js) file with your Lavalink Setting, Bot Token, and Channel ID where you want to send the status updates.

4. **Install Required Packages**:
    - Run the following command in your console:
    ```sh
    npm install
    ```

5. **Start the Bot**:
    - Use one of the following commands to start the bot:
    ```sh
    npm run start
    ```

6. **Report Issue**:
    - If you encounter any issues or the code doesn’t work, please [create an issue](https://github.com/gaurav87565/Lavalink-status/issues).
    
    OR

    Join our discord server [Discord](https://discord.gg/gMq7uwHSjY).

## Web Monitor

- Preview: [Website](https://lavalink-3z4a.onrender.com/)

1. **Enable Web Monitor**:
    - Set `webMonitor` to `true` in the [config.js](https://github.com/gaurav87565/Lavalink-status/blob/main/src/config.js) file.

2. **Custom Domain**:
    - You can setup your custom domain by using services like Cloudflare Tunnel or any other preferable services which assigns custom domain.

### Hosting 
    Register in [Render](https://render.com) 
    • Create a new Web service monitor.
    • Build Command = npm install
    • Start Command = npm run start

    Add Environment details 
    • token "",
    • channelId "",
    • expressPort ""

    Deploy your service
    • After the Deploy is completed you will see the live server add that website into some 
    website monitor such as [BetterStack](https://uptime.betterstack.com) , [UptimeeRobot]
    (https://uptimerobot.com) or any other service you like. And you are good to go

    Now your server will be online 24/7 

### Web Monitor Preview

![Discord Monitor Preview](/Images/image1.png)
![Web Monitor Dark mode Preview](/Images/image2.png)
![Web Monitor Normal mode Preview](/Images/image3.png)

- <h1 align="center">If you encounter any error join our discord server or open a issue on the github page</h1>
      
    <div align="left">
  <a href="https://discord.gg/gMq7uwHSjY" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Discord&logo=discord&label=&color=7289DA&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="discord logo"  />
  </a>
</div>
