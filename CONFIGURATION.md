# Configuration Guide

This guide explains how to configure and deploy the Deadside Killfeed Bot.

## Prerequisites

- **Node.js** version 14.0.0 or higher
- **SFTP access** to your Deadside server's log files
- **Discord webhook URLs** for each type of notification

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/TioMalandrex/deadside-killfeed-bot.git
cd deadside-killfeed-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit the `.env` file with your actual configuration values:

```env
# SFTP Configuration
SFTP_HOST=your-server-hostname.com
SFTP_PORT=22
SFTP_USERNAME=your-sftp-username
SFTP_PASSWORD=your-sftp-password
SFTP_REMOTE_DIR=/path/to/deadside/logs

# Discord Webhook URLs
DISCORD_KILL_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
DISCORD_SUICIDE_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
# ... (add all other webhook URLs)
```

## Configuration Details

### SFTP Settings

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SFTP_HOST` | Your Deadside server hostname or IP | Yes | - |
| `SFTP_PORT` | SFTP port number | No | 22 |
| `SFTP_USERNAME` | SFTP username | Yes | - |
| `SFTP_PASSWORD` | SFTP password | Yes | - |
| `SFTP_REMOTE_DIR` | Path to Deadside log files | Yes | - |

**Security Note:** The SFTP password is stored in the `.env` file. Make sure this file is:
- Never committed to version control (it's in `.gitignore`)
- Protected with appropriate file permissions (chmod 600 .env)
- Backed up securely

### Discord Webhooks

The bot uses separate webhooks for different notification types:

| Variable | Purpose |
|----------|---------|
| `DISCORD_KILL_WEBHOOK` | Player kill notifications |
| `DISCORD_SUICIDE_WEBHOOK` | Environmental deaths and suicides |
| `DISCORD_LEADERBOARD_WEBHOOK` | General leaderboard updates |
| `DISCORD_DAILY_LEADERBOARD_WEBHOOK` | Daily leaderboard |
| `DISCORD_WEEKLY_LEADERBOARD_WEBHOOK` | Weekly leaderboard |
| `DISCORD_MONTHLY_LEADERBOARD_WEBHOOK` | Monthly leaderboard |
| `DISCORD_ALLTIME_LEADERBOARD_WEBHOOK` | All-time leaderboard |
| `DISCORD_LONGSHOT_WEBHOOK` | Long-distance kill highlights |
| `DISCORD_ALL_PLAYERS_STATS_WEBHOOK` | Comprehensive player statistics |

**Creating Discord Webhooks:**

1. Go to your Discord server settings
2. Navigate to Integrations → Webhooks
3. Click "New Webhook"
4. Give it a name and select the channel
5. Copy the webhook URL
6. Paste it into your `.env` file

**Tip:** You can use the same webhook URL for multiple notification types if you want them in the same channel.

### Server Customization

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SERVER_NAME` | Display name for your server | No | "3X US" |
| `SERVER_COLOR` | Hex color for embeds | No | "#00FF00" |
| `SERVER_ICON_URL` | URL to server icon image | No | - |

### Application Settings

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Port for the health check endpoint | No | 3000 |

## Running the Bot

### Development Mode

```bash
npm start
```

### Production Deployment

For production, it's recommended to use a process manager like PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot with PM2
pm2 start deadsidekillfeed.js --name deadside-killfeed

# Save the PM2 process list
pm2 save

# Set up PM2 to start on system boot
pm2 startup
```

### Using Docker (Optional)

A Dockerfile can be created for containerized deployment:

```dockerfile
FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["node", "deadsidekillfeed.js"]
```

## Data Files

The bot creates and maintains several JSON files for persistent data:

| File | Purpose | Backup Recommended |
|------|---------|-------------------|
| `seen-lines.json` | Tracks processed log lines | No |
| `player-stats.json` | Player statistics (kills, deaths, K/D) | Yes |
| `killstreaks.json` | Active and best killstreaks | Yes |
| `longshots.json` | Long-distance kill records | Yes |
| `message-indexes.json` | Phrase rotation tracking | No |
| `highlighted-players.json` | Custom player styling | Yes |

**Backup Strategy:**
- The bot automatically creates `.backup` files before saving
- Consider setting up periodic backups of `*.json` files
- Important files: `player-stats.json`, `killstreaks.json`, `longshots.json`

## Health Check

The bot exposes a health check endpoint:

```
GET http://localhost:3000/health
```

Returns:
```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Troubleshooting

### Bot Won't Start

1. **Check environment variables**: Make sure all required variables in `.env` are filled
2. **Verify Node.js version**: Run `node --version` (must be 14.0.0+)
3. **Check dependencies**: Run `npm install` to ensure all packages are installed
4. **Review logs**: Check console output for specific error messages

### SFTP Connection Issues

1. **Verify credentials**: Test SFTP access with an SFTP client (FileZilla, WinSCP)
2. **Check firewall**: Ensure port 22 (or your custom port) is open
3. **Path verification**: Confirm `SFTP_REMOTE_DIR` path is correct
4. **Timeout errors**: The bot has a 30-second connection timeout

### Discord Webhook Errors

1. **Rate limiting**: The bot has built-in rate limit handling
2. **Invalid webhooks**: Verify webhook URLs are correct and active
3. **Channel permissions**: Ensure the webhook has permission to post

### Data Loss or Corruption

1. **Check backup files**: Look for `.backup` files in the directory
2. **File permissions**: Ensure the bot has write access to the directory
3. **Disk space**: Verify sufficient disk space is available

## Log File Format

The bot expects CSV log files with the following format:

```
timestamp,killer,victim,weapon,distance,headshot,other_data
```

Example:
```
2024-01-01 12:00:00,PlayerOne,PlayerTwo,Mosin,217,true,
```

## Advanced Configuration

### Custom Player Highlights

Create a `highlighted-players.json` file:

```json
{
  "PlayerName": {
    "prefix": "💸ASH WAKE💸 ",
    "emoji": "💸",
    "color": "#FFD700",
    "gifUrl": "https://example.com/player-highlight.gif",
    "thumbnailUrl": "https://example.com/player-avatar.png"
  }
}
```

### Multiple Servers

Currently, the bot supports one server at a time. To monitor multiple servers:

1. Deploy separate bot instances
2. Use different `.env` files for each
3. Configure different ports to avoid conflicts

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section above
