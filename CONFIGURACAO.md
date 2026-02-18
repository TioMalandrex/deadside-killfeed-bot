# Guia de Configuração

> 🇧🇷 **Esta é a versão em Português Brasileiro da documentação.**  
> 🇺🇸 **[English version (CONFIGURATION.md)](CONFIGURATION.md)**

Este guia explica como configurar e implantar o Bot Deadside Killfeed.

## Pré-requisitos

- **Node.js** versão 14.0.0 ou superior
- **Acesso SFTP** aos arquivos de log do seu servidor Deadside
- **URLs de webhook do Discord** para cada tipo de notificação

## Passos de Instalação

### 1. Clone o Repositório

```bash
git clone https://github.com/TioMalandrex/deadside-killfeed-bot.git
cd deadside-killfeed-bot
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Configure as Variáveis de Ambiente

Copie o arquivo de exemplo de ambiente:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com seus valores de configuração reais:

```env
# Configuração SFTP
SFTP_HOST=hostname-do-seu-servidor.com
SFTP_PORT=22
SFTP_USERNAME=seu-usuario-sftp
SFTP_PASSWORD=sua-senha-sftp
SFTP_REMOTE_DIR=/caminho/para/logs/deadside

# URLs de Webhook do Discord
DISCORD_KILL_WEBHOOK=https://discord.com/api/webhooks/SEU_ID_WEBHOOK/SEU_TOKEN_WEBHOOK
DISCORD_SUICIDE_WEBHOOK=https://discord.com/api/webhooks/SEU_ID_WEBHOOK/SEU_TOKEN_WEBHOOK
# ... (adicione todas as outras URLs de webhook)
```

## Detalhes de Configuração

### Configurações SFTP

| Variável | Descrição | Obrigatório | Padrão |
|----------|-----------|-------------|--------|
| `SFTP_HOST` | Hostname ou IP do seu servidor Deadside | Sim | - |
| `SFTP_PORT` | Número da porta SFTP | Não | 22 |
| `SFTP_USERNAME` | Nome de usuário SFTP | Sim | - |
| `SFTP_PASSWORD` | Senha SFTP | Sim | - |
| `SFTP_REMOTE_DIR` | Caminho para os arquivos de log do Deadside | Sim | - |

**Nota de Segurança:** A senha SFTP é armazenada no arquivo `.env`. Certifique-se de que este arquivo:
- Nunca seja commitado no controle de versão (está no `.gitignore`)
- Esteja protegido com permissões de arquivo apropriadas (chmod 600 .env)
- Tenha backup seguro

### Webhooks do Discord

O bot usa webhooks separados para diferentes tipos de notificação:

| Variável | Propósito |
|----------|-----------|
| `DISCORD_KILL_WEBHOOK` | Notificações de kill de jogadores |
| `DISCORD_SUICIDE_WEBHOOK` | Mortes ambientais e suicídios |
| `DISCORD_LEADERBOARD_WEBHOOK` | Atualizações gerais do placar |
| `DISCORD_DAILY_LEADERBOARD_WEBHOOK` | Placar diário |
| `DISCORD_WEEKLY_LEADERBOARD_WEBHOOK` | Placar semanal |
| `DISCORD_MONTHLY_LEADERBOARD_WEBHOOK` | Placar mensal |
| `DISCORD_ALLTIME_LEADERBOARD_WEBHOOK` | Placar de todos os tempos |
| `DISCORD_LONGSHOT_WEBHOOK` | Destaques de kills de longa distância |
| `DISCORD_ALL_PLAYERS_STATS_WEBHOOK` | Estatísticas abrangentes de jogadores |

**Criando Webhooks do Discord:**

1. Vá para as configurações do seu servidor Discord
2. Navegue até Integrações → Webhooks
3. Clique em "Novo Webhook"
4. Dê um nome e selecione o canal
5. Copie a URL do webhook
6. Cole no seu arquivo `.env`

**Dica:** Você pode usar a mesma URL de webhook para vários tipos de notificação se quiser todos no mesmo canal.

### Personalização do Servidor

| Variável | Descrição | Obrigatório | Padrão |
|----------|-----------|-------------|--------|
| `SERVER_NAME` | Nome de exibição para seu servidor | Não | "3X US" |
| `SERVER_COLOR` | Cor hexadecimal para embeds | Não | "#00FF00" |
| `SERVER_ICON_URL` | URL para imagem do ícone do servidor | Não | - |

### Configurações da Aplicação

| Variável | Descrição | Obrigatório | Padrão |
|----------|-----------|-------------|--------|
| `PORT` | Porta para o endpoint de verificação de saúde | Não | 3000 |

## Executando o Bot

### Modo de Desenvolvimento

```bash
npm start
```

### Implantação em Produção

Para produção, é recomendado usar um gerenciador de processos como PM2:

```bash
# Instale o PM2 globalmente
npm install -g pm2

# Inicie o bot com PM2
pm2 start deadsidekillfeed.js --name deadside-killfeed

# Salve a lista de processos do PM2
pm2 save

# Configure o PM2 para iniciar na inicialização do sistema
pm2 startup
```

### Usando Docker (Opcional)

Um Dockerfile pode ser criado para implantação containerizada:

```dockerfile
FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["node", "deadsidekillfeed.js"]
```

## Arquivos de Dados

O bot cria e mantém vários arquivos JSON para dados persistentes:

| Arquivo | Propósito | Backup Recomendado |
|---------|-----------|-------------------|
| `seen-lines.json` | Rastreia linhas de log processadas | Não |
| `player-stats.json` | Estatísticas de jogadores (kills, mortes, K/D) | Sim |
| `killstreaks.json` | Sequências de eliminações ativas e melhores | Sim |
| `longshots.json` | Registros de kills de longa distância | Sim |
| `message-indexes.json` | Rastreamento de rotação de frases | Não |
| `highlighted-players.json` | Estilização personalizada de jogadores | Sim |

**Estratégia de Backup:**
- O bot cria automaticamente arquivos `.backup` antes de salvar
- Considere configurar backups periódicos dos arquivos `*.json`
- Arquivos importantes: `player-stats.json`, `killstreaks.json`, `longshots.json`

## Verificação de Saúde

O bot expõe um endpoint de verificação de saúde:

```
GET http://localhost:3000/health
```

Retorna:
```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Solução de Problemas

### Bot Não Inicia

1. **Verifique as variáveis de ambiente**: Certifique-se de que todas as variáveis necessárias no `.env` estão preenchidas
2. **Verifique a versão do Node.js**: Execute `node --version` (deve ser 14.0.0+)
3. **Verifique as dependências**: Execute `npm install` para garantir que todos os pacotes estejam instalados
4. **Revise os logs**: Verifique a saída do console para mensagens de erro específicas

### Problemas de Conexão SFTP

1. **Verifique as credenciais**: Teste o acesso SFTP com um cliente SFTP (FileZilla, WinSCP)
2. **Verifique o firewall**: Certifique-se de que a porta 22 (ou sua porta personalizada) está aberta
3. **Verificação de caminho**: Confirme que o caminho `SFTP_REMOTE_DIR` está correto
4. **Erros de timeout**: O bot tem um timeout de conexão de 30 segundos

### Erros de Webhook do Discord

1. **Limitação de taxa**: O bot tem tratamento integrado de limite de taxa
2. **Webhooks inválidos**: Verifique se as URLs dos webhooks estão corretas e ativas
3. **Permissões do canal**: Certifique-se de que o webhook tem permissão para postar

### Perda ou Corrupção de Dados

1. **Verifique os arquivos de backup**: Procure por arquivos `.backup` no diretório
2. **Permissões de arquivo**: Certifique-se de que o bot tem acesso de gravação ao diretório
3. **Espaço em disco**: Verifique se há espaço em disco suficiente disponível

## Formato do Arquivo de Log

O bot espera arquivos de log CSV com o seguinte formato:

```
timestamp,killer,victim,weapon,distance,headshot,other_data
```

Exemplo:
```
2024-01-01 12:00:00,PlayerOne,PlayerTwo,Mosin,217,true,
```

## Configuração Avançada

### Destaques Personalizados de Jogadores

Crie um arquivo `highlighted-players.json`:

```json
{
  "NomeDoJogador": {
    "prefix": "💸ASH WAKE💸 ",
    "emoji": "💸",
    "color": "#FFD700",
    "gifUrl": "https://example.com/destaque-jogador.gif",
    "thumbnailUrl": "https://example.com/avatar-jogador.png"
  }
}
```

### Múltiplos Servidores

Atualmente, o bot suporta um servidor por vez. Para monitorar múltiplos servidores:

1. Implante instâncias separadas do bot
2. Use arquivos `.env` diferentes para cada um
3. Configure portas diferentes para evitar conflitos

## Suporte

Para problemas ou perguntas:
- Abra uma issue no GitHub
- Verifique issues existentes para soluções
- Revise a seção de solução de problemas acima
