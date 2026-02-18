# Data Schema Documentation

This document describes the structure of all JSON data files used by the Deadside Killfeed Bot.

## Overview

The bot persists data in JSON format for tracking player statistics, killstreaks, longshots, and system state. All files are stored in the bot's root directory and are created automatically on first run.

---

## File: `player-stats.json`

**Purpose**: Tracks comprehensive player statistics across different time periods.

### Structure

```json
{
  "all_time": {
    "PlayerName": {
      "kills": 247,
      "deaths": 89,
      "envDeaths": 12,
      "kd": 2.78,
      "servers": {
        "3X US": {
          "kills": 247,
          "deaths": 89,
          "envDeaths": 12
        }
      }
    }
  },
  "daily": {
    "2024-01-01": {
      "PlayerName": {
        "kills": 45,
        "deaths": 12,
        "envDeaths": 2,
        "kd": 3.75,
        "servers": { /* same structure */ }
      }
    }
  },
  "weekly": {
    "2024-W01": {
      "PlayerName": { /* same structure */ }
    }
  },
  "monthly": {
    "2024-01": {
      "PlayerName": { /* same structure */ }
    }
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `kills` | Number | Number of kills (player-caused deaths) |
| `deaths` | Number | Number of player-caused deaths |
| `envDeaths` | Number | Number of environmental/suicide deaths |
| `kd` | Number | Kill/Death ratio (excludes environmental deaths) |
| `servers` | Object | Per-server statistics (optional) |

### Time Period Keys

- **Daily**: Format `YYYY-MM-DD` (e.g., "2024-01-15")
- **Weekly**: Format `YYYY-WNN` (e.g., "2024-W03")
- **Monthly**: Format `YYYY-MM` (e.g., "2024-01")

### Notes

- K/D ratio only considers player-caused deaths, not environmental deaths
- When deaths = 0, K/D is set to the number of kills (representing infinite K/D)
- Old data (>30 days for daily, >12 weeks for weekly, >12 months for monthly) is automatically cleaned

---

## File: `killstreaks.json`

**Purpose**: Tracks active killstreaks and best streaks for each player.

### Structure

```json
{
  "PlayerName": {
    "count": 15,
    "bestStreak": 32,
    "lastKill": "2024-01-15T12:34:56.789Z",
    "servers": {
      "3X US": {
        "count": 15,
        "bestStreak": 32,
        "lastKill": "2024-01-15T12:34:56.789Z"
      }
    }
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `count` | Number | Current active killstreak count |
| `bestStreak` | Number | Highest killstreak ever achieved |
| `lastKill` | String | ISO 8601 timestamp of most recent kill |
| `servers` | Object | Per-server killstreak data (optional) |

### Behavior

- `count` is reset to 0 when player dies (by player or environment)
- `bestStreak` is never reset, only updated if current streak exceeds it
- Killstreak milestones (3, 5, 7, 10, 15, 20, 25, 30+) trigger Discord embeds
- Killstreaks ≥3 that end trigger "Killstreak Ended" embeds

---

## File: `longshots.json`

**Purpose**: Tracks long-distance kills (≥200m) across time periods.

### Structure

```json
{
  "all_time": [
    {
      "killer": "PlayerOne",
      "victim": "PlayerTwo",
      "distance": 487,
      "weapon": "Mosin",
      "timestamp": "2024-01-15T12:34:56.789Z",
      "serverName": "3X US"
    }
  ],
  "daily": {
    "2024-01-15": [
      { /* same structure as above */ }
    ]
  },
  "weekly": {
    "2024-W03": [
      { /* same structure as above */ }
    ]
  },
  "monthly": {
    "2024-01": [
      { /* same structure as above */ }
    ]
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `killer` | String | Name of the player who made the kill |
| `victim` | String | Name of the player who was killed |
| `distance` | Number | Distance in meters (integer) |
| `weapon` | String | Weapon/cause of death |
| `timestamp` | String | ISO 8601 timestamp of the kill |
| `serverName` | String | Server where kill occurred (optional) |

### Notes

- Only kills ≥200m are tracked
- Arrays are sorted by distance (descending)
- Limited to top 100 longshots per period for memory efficiency
- Duplicate prevention: identical kills (same killer, victim, distance, weapon, timestamp) are skipped

---

## File: `seen-lines.json`

**Purpose**: Prevents duplicate processing of log lines.

### Structure

```json
[
  "hash_of_log_line_1",
  "hash_of_log_line_2",
  "hash_of_log_line_3"
]
```

### Description

- Array of unique identifiers (hashes) for processed log lines
- Prevents the bot from processing the same kill/death multiple times
- Cleared periodically to prevent unbounded growth
- Not human-readable; only used internally

---

## File: `message-indexes.json`

**Purpose**: Tracks rotation indexes for kill/longshot/suicide phrases.

### Structure

```json
{
  "killPhraseIndex": 5,
  "longshotPhraseIndex": 2,
  "suicidePhraseIndex": 8
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `killPhraseIndex` | Number | Index of last used kill phrase |
| `longshotPhraseIndex` | Number | Index of last used longshot phrase |
| `suicidePhraseIndex` | Number | Index of last used suicide phrase |

### Behavior

- Indexes increment with each message to rotate through phrases
- Wraps back to 0 when end of phrase array is reached
- Provides variety in Discord embed descriptions

---

## File: `highlighted-players.json`

**Purpose**: Custom styling for specific players (optional, created manually).

### Structure

```json
{
  "PlayerName": {
    "prefix": "💸ASH WAKE💸 ",
    "emoji": "💸",
    "color": "#FFD700",
    "gifUrl": "https://example.com/highlight.gif",
    "thumbnailUrl": "https://example.com/avatar.png"
  },
  "AnotherPlayer": {
    "prefix": "🔥LEGEND🔥 ",
    "emoji": "🔥",
    "color": "#FF0000"
  }
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prefix` | String | No | Text prefix before player name |
| `emoji` | String | No | Emoji to display with player name |
| `color` | String | No | Hex color for player embeds |
| `gifUrl` | String | No | URL to GIF for kill embeds |
| `thumbnailUrl` | String | No | URL to thumbnail image |

### Notes

- All fields are optional
- If not specified, default formatting is used
- Used in kill embeds, leaderboards, and killstreak notifications
- Must be manually created; bot does not modify this file

---

## File: `leaderboard.json` (Legacy)

**Purpose**: Legacy leaderboard format (kept for backward compatibility).

### Structure

```json
{
  "all_time": {
    "PlayerName": {
      "kills": 247,
      "deaths": 89
    }
  }
}
```

### Notes

- Superseded by `player-stats.json`
- No longer actively used in current version
- May be removed in future releases

---

## Expected CSV Log Format

The bot expects Deadside server logs in CSV format with the following structure:

### Format

```csv
timestamp,killer_id,killer_name,victim_id,victim_name,weapon,distance,extra_data
```

### Example

```csv
2024-01-15 12:34:56,76561198012345678,PlayerOne,76561198087654321,PlayerTwo,Mosin,217,headshot
2024-01-15 12:35:10,76561198087654321,PlayerTwo,76561198087654321,PlayerTwo,Falling,0,suicide
```

### Column Descriptions

| Column | Index | Description | Example |
|--------|-------|-------------|---------|
| Timestamp | 0 | Date and time of event | `2024-01-15 12:34:56` |
| Killer ID | 1 | Steam ID of killer (unused) | `76561198012345678` |
| Killer Name | 2 | In-game name of killer | `PlayerOne` |
| Victim ID | 3 | Steam ID of victim (unused) | `76561198087654321` |
| Victim Name | 4 | In-game name of victim | `PlayerTwo` |
| Weapon/Cause | 5 | Weapon or death cause | `Mosin` or `Falling` |
| Distance | 6 | Distance in meters | `217` |
| Extra Data | 7+ | Additional fields (unused) | `headshot` |

### Special Cases

- **Suicide**: Killer name = Victim name
- **Environmental Death**: Weapon contains `suicide`, `falling`, or `relocation`
- **Longshot**: Distance ≥ 200

---

## Backup Files

The bot creates automatic backup files when saving data:

| Original File | Backup File | Temporary File |
|---------------|-------------|----------------|
| `player-stats.json` | `player-stats.json.backup` | `player-stats.json.tmp` |
| `killstreaks.json` | `killstreaks.json.backup` | `killstreaks.json.tmp` |
| `longshots.json` | `longshots.json.backup` | `longshots.json.tmp` |
| `seen-lines.json` | `seen-lines.json.backup` | `seen-lines.json.tmp` |
| `message-indexes.json` | `message-indexes.json.backup` | `message-indexes.json.tmp` |

### Backup Process

1. Data is written to `.tmp` file
2. If original file exists, it's copied to `.backup`
3. `.tmp` file is atomically renamed to original filename
4. If write fails, `.tmp` is cleaned up and `.backup` remains intact

---

## Data Retention

The bot automatically cleans old data to prevent unbounded growth:

| Data Type | Retention Period |
|-----------|------------------|
| Daily stats | 30 days |
| Weekly stats | 12 weeks |
| Monthly stats | 12 months |
| All-time stats | Forever |
| Longshots | Top 100 per period |
| Killstreaks | Forever (active + best) |
| Seen lines | Cleared periodically |

---

## Manual Data Management

### Viewing Data

All files are human-readable JSON. You can view them with any text editor:

```bash
cat player-stats.json | jq '.'
```

### Resetting Data

To reset all statistics:

```bash
rm player-stats.json killstreaks.json longshots.json seen-lines.json
```

The bot will recreate these files on next run.

### Restoring from Backup

If data is corrupted:

```bash
cp player-stats.json.backup player-stats.json
```

### Exporting Data

To export statistics for analysis:

```bash
# Pretty-print JSON
cat player-stats.json | jq '.' > stats-export.json

# Extract specific data
cat player-stats.json | jq '.all_time | to_entries[] | {name: .key, kills: .value.kills, kd: .value.kd}' > players.json
```

---

## Schema Version

Current schema version: **1.1**

Last updated: January 2024

Changes from 1.0:
- Added `envDeaths` field to player stats
- Added `bestStreak` field to killstreaks
- Added duplicate prevention to longshots
- Deprecated `leaderboard.json` in favor of `player-stats.json`
