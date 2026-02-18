# 🧠 Deadside Killfeed + Bot de Placar

Um bot Node.js totalmente personalizado para servidores do jogo Deadside. Ele lê logs de morte via SFTP e envia killfeed dinâmico, suicídios, tiros longos e estatísticas de placar para o Discord — totalmente estilizado e automatizado.

[![Node.js](https://img.shields.io/badge/Node.js-14%2B-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📋 Índice

- [Recursos](#️-recursos)
- [Funcionalidades Detalhadas](#-funcionalidades-detalhadas)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Stack Tecnológica](#️-stack-tecnológica)
- [Estrutura de Dados](#-estrutura-de-dados)
- [Personalização](#-personalização)
- [Segurança](#-segurança)
- [Solução de Problemas](#-solução-de-problemas)
- [API e Monitoramento](#-api-e-monitoramento)
- [Contribuindo](#-contribuindo)

---

## ⚙️ Recursos

- 🔫 **Killfeed em tempo real** e logs de suicídio
- 💥 **Rastreamento de tiros longos** (≥200m) + alertas de sequência de eliminações (3, 5, 7, 10, 15, 20, 25, 30+ kills)
- 📊 **Placares multi-nível** (diário, semanal, mensal, todos os tempos)
- 📁 **Rastreamento persistente** de estatísticas em JSON (kills, mortes, K/D)
- 🔁 **Frases rotativas** de kill/tiro longo/suicídio para variedade
- 🎭 **Sistema de destaque de jogadores** (GIFs, cores, emojis, prefixos personalizados)
- 🧵 **Sistema de fila** de embeds do Discord para evitar limites de taxa
- 🔒 **Gravação atômica** de arquivos com proteção de backup
- ⚡ **Timeout de conexão** SFTP e lógica de retry
- 🏥 **Endpoint de verificação de saúde** para monitoramento

---

## 🎯 Funcionalidades Detalhadas

### 1. 🔫 Killfeed em Tempo Real

Monitora kills de jogadores em tempo real e publica notificações imediatas no Discord.

**Informações exibidas:**
- Nome do killer e da vítima
- Arma utilizada
- Distância do tiro (em metros)
- Servidor e hora exata

**Exemplo:**
```
💀 JoãoGamer eliminou PedroNoob com Mosin (217m)
⏰ 15:34:22 | Servidor: 3X BR
```

**Frases rotativas** - O bot usa mais de 25 frases diferentes para manter as mensagens interessantes:
- "apagou da existência"
- "mandou de volta pro lobby"
- "transformou em memória"
- E muitas outras!

### 2. ⚡ Sistema de Sequências (Killstreaks)

Rastreia sequências de kills consecutivas e anuncia marcos especiais:

| Kills | Marco |
|-------|-------|
| 3 | "Sequência iniciada!" |
| 5 | "Em chamas!" |
| 7 | "Dominando!" |
| 10 | "Imparável!" |
| 15 | "Deus da Guerra!" |
| 20 | "Lendário!" |
| 25 | "Mítico!" |
| 30+ | "EXTERMINADOR!" |

**Fim de sequência**: Quando uma sequência ≥3 termina, anuncia quem encerrou a sequência.

### 3. 🎯 Tiros Longos (Longshots)

Kills acima de **200 metros** são destacados especialmente:
- Notificação especial no Discord
- Registrado no ranking de longshots
- Top 100 longshots por período (diário, semanal, mensal, todos os tempos)

### 4. 📊 Placares Multi-Nível

O bot mantém 4 tipos de placares:

#### 📅 Placar Diário
- Reinicia todo dia à meia-noite
- Top 10 jogadores do dia

#### 📆 Placar Semanal
- Reinicia toda segunda-feira
- Top 10 da semana

#### 📆 Placar Mensal
- Reinicia no primeiro dia do mês
- Top 10 do mês

#### 🏆 Placar de Todos os Tempos
- Nunca reseta
- Estatísticas históricas completas

**Informações em cada placar:**
```
🏆 Placar Semanal - 3X BR

1. 👑 RafaelPro
   Kills: 247 | Mortes: 89 | K/D: 2.78
   Mortes Ambientais: 5
   
2. ⭐ BrunoGamer  
   Kills: 198 | Mortes: 102 | K/D: 1.94
   Mortes Ambientais: 3

━━━━━━━━━━━━━━━━━━━━━━━━
⚡ Top 5 Sequências Ativas

1. RafaelPro: 15 kills (Melhor: 32)
2. BrunoGamer: 7 kills (Melhor: 18)
```

### 5. 🎭 Sistema de Destaque de Jogadores

Personalize a aparência de jogadores específicos com:
- **Prefixo** customizado (ex: "💸VIP💸")
- **Emoji** personalizado
- **Cor** dos embeds
- **GIF** animado nos kills
- **Avatar** customizado

### 6. 💀 Rastreamento de Mortes

**Tipos rastreados:**
- **Mortes por jogadores**: Contam para K/D
- **Mortes ambientais**: Queda, afogamento, radiação, etc.

**Frases de suicídio** - Mais de 50 frases variadas:
- "não aguentou a pressão"
- "desapareceu sem deixar rastros"
- "rage quit sem o quit"

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- **Node.js** 14.0.0 ou superior
- **Acesso SFTP** aos logs do servidor Deadside
- **URLs de webhook** do Discord

### Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/TioMalandrex/deadside-killfeed-bot.git
cd deadside-killfeed-bot

# 2. Instale as dependências
npm install

# 3. Configure o ambiente
cp .env.example .env
nano .env  # Edite com suas credenciais

# 4. Inicie o bot
npm start
```

### Configuração Detalhada

#### 1. Variáveis de Ambiente (`.env`)

```env
# === SFTP - Acesso aos Logs ===
SFTP_HOST=seu-servidor.com          # Hostname ou IP do servidor
SFTP_PORT=22                         # Porta SFTP (padrão: 22)
SFTP_USERNAME=usuario                # Usuário SFTP
SFTP_PASSWORD=senha                  # Senha SFTP
SFTP_REMOTE_DIR=/logs/deadside       # Caminho para logs

# === Discord Webhooks ===
DISCORD_KILL_WEBHOOK=https://discord.com/api/webhooks/...
DISCORD_SUICIDE_WEBHOOK=https://discord.com/api/webhooks/...
DISCORD_LEADERBOARD_WEBHOOK=https://discord.com/api/webhooks/...
DISCORD_DAILY_LEADERBOARD_WEBHOOK=https://discord.com/api/webhooks/...
DISCORD_WEEKLY_LEADERBOARD_WEBHOOK=https://discord.com/api/webhooks/...
DISCORD_MONTHLY_LEADERBOARD_WEBHOOK=https://discord.com/api/webhooks/...
DISCORD_ALLTIME_LEADERBOARD_WEBHOOK=https://discord.com/api/webhooks/...
DISCORD_LONGSHOT_WEBHOOK=https://discord.com/api/webhooks/...
DISCORD_ALL_PLAYERS_STATS_WEBHOOK=https://discord.com/api/webhooks/...

# === Personalização do Servidor ===
SERVER_NAME=3X BR                    # Nome do servidor
SERVER_COLOR=#00FF00                 # Cor dos embeds (hex)
SERVER_ICON_URL=https://...          # URL do ícone do servidor

# === Configurações Opcionais ===
PORT=3000                            # Porta do health check
```

#### 2. Criando Webhooks do Discord

1. Vá para **Configurações do Servidor** no Discord
2. Clique em **Integrações** → **Webhooks**
3. Clique em **Novo Webhook**
4. Dê um nome e selecione o canal
5. Copie a **URL do webhook**
6. Cole no arquivo `.env`

**Dica**: Use o mesmo webhook para tudo ou separe por canais:
- `#killfeed` - Kills em tempo real
- `#suicidios` - Mortes ambientais
- `#longshots` - Tiros longos
- `#sequencias` - Killstreaks
- `#placar` - Leaderboards

#### 3. Formato de Log Esperado

O bot espera logs CSV do Deadside com este formato:

```csv
timestamp,killer_id,killer_name,victim_id,victim_name,weapon,distance,extra
2024-01-15 12:34:56,76561198012345678,PlayerOne,76561198087654321,PlayerTwo,Mosin,217,headshot
```

### Deployment em Produção

#### Com PM2 (Recomendado)

```bash
# Instale o PM2
npm install -g pm2

# Inicie o bot
pm2 start deadsidekillfeed.js --name deadside-killfeed

# Salve a configuração
pm2 save

# Configure para iniciar com o sistema
pm2 startup
```

#### Com Docker

```dockerfile
FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["node", "deadsidekillfeed.js"]
```

---

## 🛠️ Stack Tecnológica

| Tecnologia | Uso |
|------------|-----|
| **Node.js** | Ambiente de execução |
| **ssh2-sftp-client** | Acesso aos logs via SFTP |
| **Axios** | Requisições HTTP para webhooks |
| **csv-parse** | Análise de arquivos CSV |
| **Express.js** | API de health check |
| **dotenv** | Gerenciamento de variáveis de ambiente |

---

## 💾 Estrutura de Dados

O bot persiste dados em arquivos JSON locais:

### Arquivos Criados Automaticamente

| Arquivo | Propósito | Backup |
|---------|-----------|--------|
| `player-stats.json` | Estatísticas de jogadores | ✅ Recomendado |
| `killstreaks.json` | Sequências ativas e recordes | ✅ Recomendado |
| `longshots.json` | Ranking de tiros longos | ✅ Recomendado |
| `seen-lines.json` | Controle de linhas processadas | ❌ |
| `message-indexes.json` | Rotação de frases | ❌ |
| `highlighted-players.json` | Destaques personalizados | ✅ Recomendado |

### Estrutura: `player-stats.json`

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
  "daily": { "2024-01-15": { /* ... */ } },
  "weekly": { "2024-W03": { /* ... */ } },
  "monthly": { "2024-01": { /* ... */ } }
}
```

**Campos:**
- `kills` - Kills de jogadores
- `deaths` - Mortes por jogadores
- `envDeaths` - Mortes ambientais
- `kd` - Razão Kill/Death (exclui mortes ambientais)

### Estrutura: `killstreaks.json`

```json
{
  "PlayerName": {
    "count": 15,
    "bestStreak": 32,
    "lastKill": "2024-01-15T12:34:56.789Z",
    "servers": {
      "3X US": {
        "count": 15,
        "bestStreak": 32
      }
    }
  }
}
```

### Estrutura: `longshots.json`

```json
{
  "all_time": [
    {
      "killer": "PlayerOne",
      "victim": "PlayerTwo",
      "distance": 487,
      "weapon": "Mosin",
      "timestamp": "2024-01-15T12:34:56.789Z"
    }
  ],
  "daily": {},
  "weekly": {},
  "monthly": {}
}
```

**Limitações:**
- Top 100 longshots por período
- Ordenados por distância (maior → menor)
- Prevenção de duplicatas

### Retenção de Dados

| Tipo | Retenção |
|------|----------|
| Diário | 30 dias |
| Semanal | 12 semanas |
| Mensal | 12 meses |
| Todos os tempos | Permanente |

### Backup Automático

O bot cria arquivos `.backup` antes de cada salvamento:
- `player-stats.json.backup`
- `killstreaks.json.backup`
- etc.

Para restaurar: `cp arquivo.json.backup arquivo.json`

---

## 🔧 Personalização

### Destaque de Jogadores

Crie `highlighted-players.json`:

```json
{
  "NickDoJogador": {
    "prefix": "👑ADMIN👑 ",
    "emoji": "⚡",
    "color": "#FF0000",
    "gifUrl": "https://example.com/gif.gif",
    "thumbnailUrl": "https://example.com/avatar.png"
  }
}
```

**Todas as opções são opcionais!**

### Customizar Frases

Edite `deadsidekillfeed.js` e procure por:
- `KILL_PHRASES` - Frases de kill (25 frases)
- `LONGSHOT_PHRASES` - Frases de longshot (10 frases)
- `SUICIDE_PHRASES` - Frases de suicídio (50 frases)
- `KILLSTREAK_MILESTONES` - Marcos de sequência

### Múltiplos Servidores

Para monitorar múltiplos servidores:
1. Rode instâncias separadas do bot
2. Use arquivos `.env` diferentes
3. Configure portas diferentes

---

## 🔒 Segurança

### Recursos de Segurança

✅ **Gravação Atômica de Arquivos**
- Escreve em arquivo temporário primeiro
- Cria backup antes de sobrescrever
- Renomeia atomicamente (sem corrupção)

✅ **Variáveis de Ambiente**
- Credenciais não estão no código
- Arquivo `.env` no `.gitignore`
- Use `chmod 600 .env` para proteção

✅ **Rate Limiting**
- Fila de mensagens do Discord
- Respeita limites da API
- Retry automático

✅ **Validação de Entrada**
- Nomes de jogadores validados
- Limite de 100 caracteres
- Sanitização de dados

✅ **Timeouts**
- SFTP: 30 segundos
- Keepalive: 10 segundos
- Reconexão automática

### Melhores Práticas

**Proteção de Arquivos:**
```bash
chmod 600 .env                    # Apenas dono pode ler/escrever
chmod 700 *.json                  # Proteger dados
```

**Backup Regular:**
```bash
# Automatize backups
tar -czf backup-$(date +%Y%m%d).tar.gz *.json
```

**Monitoramento:**
- Use o endpoint `/health` para monitorar
- Configure alertas de downtime
- Revise logs regularmente

### Problemas Conhecidos

⚠️ **Senha SFTP em `.env`**
- Armazenada em texto plano
- **Solução**: Use autenticação por chave SSH
- Nunca commite o `.env`!

---

## 🐛 Solução de Problemas

### Bot Não Inicia

**Problema**: Erro ao iniciar o bot

**Soluções:**
1. Verifique se todas as variáveis do `.env` estão preenchidas
2. Confirme Node.js 14.0.0+ com `node --version`
3. Execute `npm install` para instalar dependências
4. Verifique logs de erro no console

### Problemas de Conexão SFTP

**Problema**: Não conecta ao servidor SFTP

**Soluções:**
1. Teste credenciais com cliente SFTP (FileZilla, WinSCP)
2. Verifique firewall permite porta 22
3. Confirme caminho `SFTP_REMOTE_DIR` está correto
4. Verifique timeout (padrão: 30s)

**Comando de teste:**
```bash
sftp -P 22 usuario@servidor.com
```

### Erros de Webhook do Discord

**Problema**: Webhooks não funcionam

**Soluções:**
1. Verifique URLs estão corretas e completas
2. Confirme canal do webhook ainda existe
3. Teste webhook manualmente:
```bash
curl -X POST "WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content":"Teste"}'
```

### Dados Não Salvam

**Problema**: Estatísticas resetam

**Soluções:**
1. Verifique permissões de escrita no diretório
2. Confirme espaço em disco disponível
3. Procure arquivos `.backup` para restaurar
4. Verifique logs de erro de salvamento

### Mensagens Duplicadas

**Problema**: Mesma kill aparece múltiplas vezes

**Soluções:**
1. Verifique arquivo `seen-lines.json` existe
2. Não rode múltiplas instâncias no mesmo diretório
3. Limpe cache: `rm seen-lines.json` e reinicie

### Performance Lenta

**Problema**: Bot está lento

**Soluções:**
1. Verifique tamanho dos arquivos JSON
2. Limpe dados antigos manualmente
3. Reduza frequência de verificação SFTP
4. Monitore uso de CPU/memória com `pm2 monit`

---

## 📡 API e Monitoramento

### Health Check Endpoint

**URL**: `http://localhost:3000/health`

**Método**: `GET`

**Resposta:**
```json
{
  "status": "ok",
  "uptime": 86400,
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Uso:**
```bash
# Verificar se está online
curl http://localhost:3000/health

# Integrar com monitoring
# (Prometheus, Grafana, etc.)
```

### Logs

O bot registra todas as operações:

```bash
# Ver logs com PM2
pm2 logs deadside-killfeed

# Ver logs em tempo real
pm2 logs deadside-killfeed --lines 100
```

**Tipos de log:**
- ✅ Sucesso (verde)
- ⚠️ Avisos (amarelo)
- ❌ Erros (vermelho)
- 📊 Informações (azul)

---

## 🤝 Contribuindo

Contribuições são bem-vindas!

### Como Contribuir

1. **Fork** o repositório
2. Crie uma **branch**: `git checkout -b feature/NovaFuncionalidade`
3. **Commit** suas mudanças: `git commit -m 'Adiciona Nova Funcionalidade'`
4. **Push** para a branch: `git push origin feature/NovaFuncionalidade`
5. Abra um **Pull Request**

### Guidelines

- Mantenha o código em **PT-BR**
- Adicione comentários explicativos
- Teste suas mudanças localmente
- Siga o estilo de código existente

---

## 📝 Licença

Este projeto está licenciado sob a **Licença MIT**.

---

## 🙏 Agradecimentos

- **Desenvolvedores do Deadside** pelo jogo incrível
- **Discord** pela robusta API de webhooks
- **Comunidade open-source** pelas excelentes bibliotecas Node.js
- **Jogadores brasileiros** que inspiraram este projeto

---

## 📞 Suporte

**Problemas ou dúvidas?**
1. Consulte a seção [Solução de Problemas](#-solução-de-problemas)
2. Verifique [issues existentes](https://github.com/TioMalandrex/deadside-killfeed-bot/issues)
3. Abra uma [nova issue](https://github.com/TioMalandrex/deadside-killfeed-bot/issues/new)

---

## 🎮 Exemplo Completo de Saída

```
💀 RafaelPro apagou CarlosNoob da existência com Mosin (217m)
⏰ 15:34:22 | 3X BR

⚡ Alerta de Sequência de Abates!
RafaelPro está imparável! (10 abates)
🔥 Sequência atual: 10 | Melhor: 32

🎯 TIRO LONGO!
Fernando acertou Carlos @ 487m com Mosin
🏆 Novo recorde pessoal!

🏆 Placar Semanal - 3X BR
1. 👑 RafaelPro - 247 kills | 89 mortes | 2.78 K/D
2. ⭐ BrunoGamer - 198 kills | 102 mortes | 1.94 K/D
3. 🔥 CarlosSniper - 156 kills | 78 mortes | 2.00 K/D
```

---

**Feito com ❤️ para a comunidade Deadside brasileira! 🇧🇷**

**Bot 100% em Português | Totalmente Open Source | Pronto para Produção**
