# 🧠 Deadside Killfeed + Leaderboard Bot

A fully custom Node.js bot for Deadside game servers. It reads death logs over SFTP and pushes dynamic killfeed, suicides, longshots, and leaderboard stats to Discord — fully styled and automated.

[![Node.js](https://img.shields.io/badge/Node.js-14%2B-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📋 Table of Contents

- [Features](#️-features)
- [Quick Start](#-quick-start)
- [Tech Stack](#️-tech-stack)
- [Example Output](#-example-output)
- [Documentation](#-documentation)
- [Customization](#-customization)
- [Contributing](#-contributing)

---

## ⚙️ Features

- 🔫 Real-time killfeed and suicide logs
- 💥 Longshot tracking + killstreak milestone alerts (3, 5, 7, 10, 15, 20, 25, 30+ kills)
- 📊 Multi-tier leaderboards (daily, weekly, monthly, all-time)
- 📁 Persistent JSON stat tracking (kills, deaths, K/D)
- 🔁 Rotating kill/longshot/suicide phrases for variety
- 🎭 Player highlight system (GIFs, colors, emojis, custom prefixes)
- 🧵 Discord embed queue system to avoid rate limits
- 🔒 Atomic file writes with backup protection
- ⚡ SFTP connection timeout and retry logic
- 🏥 Health check endpoint for monitoring

---

## 🚀 Quick Start

### Prerequisites

- Node.js 14.0.0 or higher
- SFTP access to your Deadside server logs
- Discord webhook URLs

### Installation

```bash
# Clone the repository
git clone https://github.com/TioMalandrex/deadside-killfeed-bot.git
cd deadside-killfeed-bot

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start the bot
npm start
```

For detailed setup instructions, see [CONFIGURATION.md](CONFIGURATION.md).

---

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **ssh2-sftp-client** - SFTP file access
- **Axios** - Discord webhook HTTP requests
- **csv-parse** - CSV log file parsing
- **Express.js** - Health check API endpoint
- **dotenv** - Environment variable management

---

## 🎮 Example Output

> **💀 JeffBezzoss erased YouLackSkill from existence with Mosin (217m)**  
> **⚡ Killstreak! YouLackSkill is dominating!**  
> **🎯 Longshot: JeffBezzoss → Dacowmonster707 @ 312m**  

### Leaderboard Example

```
🏆 Weekly Leaderboard

1. 👑 PlayerOne - 247 kills | 89 deaths | 2.78 K/D
2. ⭐ PlayerTwo - 198 kills | 102 deaths | 1.94 K/D
3. 🔥 PlayerThree - 156 kills | 78 deaths | 2.00 K/D
```

---

## 📚 Documentation

- **[Configuration Guide](CONFIGURATION.md)** - Detailed setup and deployment instructions
- **[Security Policy](SECURITY.md)** - Security features, best practices, and known issues
- **[API Reference](#health-check-api)** - Health check endpoint documentation

### Health Check API

The bot exposes a health check endpoint for monitoring:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔧 Customization

### Player Highlights

Create a `highlighted-players.json` file to customize specific players:

```json
{
  "JeffBezzoss": {
    "prefix": "💸ASH WAKE💸 ",
    "emoji": "💸",
    "color": "#FFD700",
    "gifUrl": "https://example.com/highlight.gif",
    "thumbnailUrl": "https://example.com/avatar.png"
  }
}
```

### Environment Variables

All configuration is done through environment variables in the `.env` file:

```env
# SFTP Configuration
SFTP_HOST=your-server.com
SFTP_PORT=22
SFTP_USERNAME=username
SFTP_PASSWORD=password
SFTP_REMOTE_DIR=/path/to/logs

# Discord Webhooks
DISCORD_KILL_WEBHOOK=https://discord.com/api/webhooks/...
DISCORD_SUICIDE_WEBHOOK=https://discord.com/api/webhooks/...
# ... more webhooks

# Server Customization
SERVER_NAME=3X US
SERVER_COLOR=#00FF00
SERVER_ICON_URL=https://example.com/icon.png
```

See [.env.example](.env.example) for all available options.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 🐛 Troubleshooting

### Bot won't start
- Check that all required environment variables in `.env` are set
- Verify Node.js version with `node --version` (14.0.0+)
- Run `npm install` to ensure dependencies are installed

### SFTP connection issues
- Verify credentials with an SFTP client
- Check that the remote directory path is correct
- Ensure firewall allows SFTP connections (port 22)

### Discord webhook errors
- Verify webhook URLs are correct and active
- Check that the webhook channel still exists
- The bot has built-in rate limit handling

For more troubleshooting help, see [CONFIGURATION.md](CONFIGURATION.md#troubleshooting).

---

## 🙏 Acknowledgments

- Deadside game developers for the awesome game
- Discord for their robust webhook API
- The open-source community for excellent Node.js libraries

---

**Made with ❤️ for the Deadside community**
