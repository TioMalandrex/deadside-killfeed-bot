# Security Policy

## Overview

This document outlines security considerations and best practices for the Deadside Killfeed Bot.

## Security Features

### 1. Atomic File Writes

The bot uses atomic file write operations with backup to prevent data corruption:

- Writes to temporary files first (`.tmp`)
- Creates backup files before overwriting (`.backup`)
- Atomically renames files to prevent partial writes
- Automatic cleanup of temporary files on failure

### 2. Environment Variable Configuration

Sensitive credentials are stored in environment variables:

- SFTP passwords are not hardcoded in the source
- Discord webhook URLs are externalized
- Configuration is loaded from `.env` file (not committed to git)

### 3. Error Handling

- Global exception handlers prevent crashes
- Unhandled promise rejection handling
- Graceful degradation on errors
- Detailed error logging for debugging

### 4. Rate Limiting

- Built-in Discord API rate limit handling
- Queued message system to prevent 429 errors
- Automatic retry with exponential backoff

### 5. Connection Timeouts

- 30-second timeout for SFTP connections
- Keepalive packets every 10 seconds
- Automatic reconnection on connection failures

## Reported Vulnerabilities

### Fixed Issues

#### 1. ✅ Empty Configuration Object (CRITICAL)
- **Status**: Fixed in current version
- **Description**: Server configuration had empty fields
- **Fix**: Migrated to environment variables via dotenv

#### 2. ✅ K/D Calculation Bug (MEDIUM)
- **Status**: Fixed in current version
- **Description**: K/D ratio was incorrect when deaths = 0
- **Fix**: Now properly handles division by zero case

#### 3. ✅ File Write Corruption Risk (HIGH)
- **Status**: Fixed in current version
- **Description**: Non-atomic file writes could corrupt data
- **Fix**: Implemented atomic write operations with backups

#### 4. ✅ SFTP Connection Timeout (HIGH)
- **Status**: Fixed in current version
- **Description**: No timeout configured for SFTP operations
- **Fix**: Added 30-second timeout and keepalive configuration

### Known Issues

#### 1. ⚠️ SFTP Password Storage (MEDIUM)
- **Description**: SFTP password stored in plaintext in `.env` file
- **Risk**: If `.env` file is compromised, credentials are exposed
- **Mitigation**: 
  - `.env` file is in `.gitignore` and never committed
  - Recommend setting file permissions: `chmod 600 .env`
  - Consider using SSH keys instead of password authentication
- **Future Enhancement**: Support for SSH key authentication

#### 2. ⚠️ No Input Validation for Player Names (LOW)
- **Description**: Player names from logs are not sanitized
- **Risk**: Malformed names could theoretically break Discord embeds
- **Mitigation**: Discord API handles most special characters safely
- **Status**: Low priority - no known exploits

#### 3. ⚠️ Concurrent Write Risk (LOW)
- **Description**: Multiple simultaneous kills could cause phrase index collision
- **Risk**: Same kill phrase might be used twice in rapid succession
- **Mitigation**: Extremely rare under normal game conditions
- **Status**: Low priority - cosmetic issue only

## Best Practices

### Deployment Security

1. **File Permissions**
   ```bash
   chmod 600 .env  # Protect environment file
   chmod 700 *.json  # Protect data files
   ```

2. **User Isolation**
   - Run the bot as a non-privileged user
   - Don't run as root/administrator
   - Use a dedicated service account

3. **Network Security**
   - Use firewall rules to restrict SFTP access
   - Consider VPN for SFTP connections
   - Use HTTPS for Discord webhooks (default)

4. **Access Control**
   - Limit who has access to the server
   - Regularly rotate SFTP credentials
   - Monitor webhook usage in Discord

### Data Protection

1. **Backup Strategy**
   ```bash
   # Automated backup script example
   tar -czf backup-$(date +%Y%m%d).tar.gz *.json
   ```

2. **Data Retention**
   - Bot automatically cleans data older than 30 days
   - Manually backup before major updates
   - Test restore procedures regularly

3. **Sensitive Data**
   - Player statistics are not considered sensitive
   - Webhook URLs should be kept private
   - SFTP credentials must be protected

### Monitoring

1. **Log Review**
   - Check logs regularly for errors
   - Monitor for repeated connection failures
   - Watch for rate limit warnings

2. **Health Checks**
   - Use the `/health` endpoint for monitoring
   - Set up alerts for downtime
   - Track response times

3. **Discord Activity**
   - Monitor webhook posting activity
   - Check for unexpected patterns
   - Verify data accuracy

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email the maintainer directly (if available)
3. Provide detailed information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Update Process

When security updates are released:

1. Updates will be documented in releases
2. Critical updates will be clearly marked
3. Breaking changes will be announced
4. Migration guides will be provided

## Compliance

### Data Privacy

- Bot only processes game statistics (kills, deaths)
- No personal information is collected
- Player names are game usernames only
- Data is stored locally, not transmitted elsewhere

### Discord Terms of Service

- Bot complies with Discord's API rate limits
- Webhooks are used as intended
- No spam or abuse of Discord services
- Respects Discord's content policies

## Security Checklist

Before deploying to production:

- [ ] `.env` file created with all required variables
- [ ] `.env` file has proper permissions (600)
- [ ] `.gitignore` includes `.env` and sensitive files
- [ ] SFTP credentials tested and working
- [ ] Discord webhooks tested and working
- [ ] Bot runs as non-privileged user
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring/alerts configured
- [ ] Health check endpoint accessible

## Additional Resources

- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Discord API Documentation](https://discord.com/developers/docs/intro)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024 | Initial security documentation |
| 1.1.0 | 2024 | Added atomic file writes, environment variables, SFTP timeouts |
