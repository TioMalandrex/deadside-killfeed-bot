# 🧠 Deadside Killfeed + Bot de Placar

Um bot Node.js totalmente personalizado para servidores do jogo Deadside. Ele lê logs de morte via SFTP e envia killfeed dinâmico, suicídios, tiros longos e estatísticas de placar para o Discord — totalmente estilizado e automatizado.

[![Node.js](https://img.shields.io/badge/Node.js-14%2B-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📋 Índice

- [Recursos](#️-recursos)
- [Início Rápido](#-início-rápido)
- [Stack Tecnológica](#️-stack-tecnológica)
- [Exemplo de Saída](#-exemplo-de-saída)
- [Documentação](#-documentação)
- [Personalização](#-personalização)
- [Contribuindo](#-contribuindo)

---

## ⚙️ Recursos

- 🔫 Killfeed em tempo real e logs de suicídio
- 💥 Rastreamento de tiros longos + alertas de sequência de eliminações (3, 5, 7, 10, 15, 20, 25, 30+ kills)
- 📊 Placares multi-nível (diário, semanal, mensal, todos os tempos)
- 📁 Rastreamento persistente de estatísticas em JSON (kills, mortes, K/D)
- 🔁 Frases rotativas de kill/tiro longo/suicídio para variedade
- 🎭 Sistema de destaque de jogadores (GIFs, cores, emojis, prefixos personalizados)
- 🧵 Sistema de fila de embeds do Discord para evitar limites de taxa
- 🔒 Gravação atômica de arquivos com proteção de backup
- ⚡ Timeout de conexão SFTP e lógica de retry
- 🏥 Endpoint de verificação de saúde para monitoramento

---

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 14.0.0 ou superior
- Acesso SFTP aos logs do seu servidor Deadside
- URLs de webhook do Discord

### Instalação

```bash
# Clone o repositório
git clone https://github.com/TioMalandrex/deadside-killfeed-bot.git
cd deadside-killfeed-bot

# Instale as dependências
npm install

# Copie o template de ambiente
cp .env.example .env

# Edite o .env com sua configuração
nano .env

# Inicie o bot
npm start
```

Para instruções detalhadas de configuração, veja [CONFIGURACAO.md](CONFIGURACAO.md).

---

## 🛠️ Stack Tecnológica

- **Node.js** - Ambiente de execução
- **ssh2-sftp-client** - Acesso a arquivos via SFTP
- **Axios** - Requisições HTTP para webhooks do Discord
- **csv-parse** - Análise de arquivos de log CSV
- **Express.js** - Endpoint de API de verificação de saúde
- **dotenv** - Gerenciamento de variáveis de ambiente

---

## 🎮 Exemplo de Saída

> **💀 JeffBezzoss apagou YouLackSkill da existência com Mosin (217m)**  
> **⚡ Sequência de Eliminações! YouLackSkill está dominando!**  
> **🎯 Tiro Longo: JeffBezzoss → Dacowmonster707 @ 312m**  

### Exemplo de Placar

```
🏆 Placar Semanal

1. 👑 PlayerOne - 247 kills | 89 mortes | 2.78 K/D
2. ⭐ PlayerTwo - 198 kills | 102 mortes | 1.94 K/D
3. 🔥 PlayerThree - 156 kills | 78 mortes | 2.00 K/D
```

---

## 📚 Documentação

- **[Funcionalidades e Comandos](FUNCIONALIDADES.md)** - Guia completo de todas as funcionalidades do bot
- **[Guia de Configuração](CONFIGURACAO.md)** - Instruções detalhadas de configuração e implantação
- **[Política de Segurança](SEGURANCA.md)** - Recursos de segurança, melhores práticas e problemas conhecidos
- **[Esquema de Dados](ESQUEMA_DADOS.md)** - Estrutura dos arquivos de dados JSON
- **[Referência da API](#api-de-verificação-de-saúde)** - Documentação do endpoint de verificação de saúde

### API de Verificação de Saúde

O bot expõe um endpoint de verificação de saúde para monitoramento:

```bash
curl http://localhost:3000/health
```

Resposta:
```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔧 Personalização

### Destaque de Jogadores

Crie um arquivo `highlighted-players.json` para personalizar jogadores específicos:

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

### Variáveis de Ambiente

Toda a configuração é feita através de variáveis de ambiente no arquivo `.env`:

```env
# Configuração SFTP
SFTP_HOST=seu-servidor.com
SFTP_PORT=22
SFTP_USERNAME=usuario
SFTP_PASSWORD=senha
SFTP_REMOTE_DIR=/caminho/para/logs

# Webhooks do Discord
DISCORD_KILL_WEBHOOK=https://discord.com/api/webhooks/...
DISCORD_SUICIDE_WEBHOOK=https://discord.com/api/webhooks/...
# ... mais webhooks

# Personalização do Servidor
SERVER_NAME=3X US
SERVER_COLOR=#00FF00
SERVER_ICON_URL=https://example.com/icon.png
```

Veja [.env.example](.env.example) para todas as opções disponíveis.

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para enviar um Pull Request.

1. Faça um fork do repositório
2. Crie sua branch de feature (`git checkout -b feature/RecursoIncrivel`)
3. Commit suas mudanças (`git commit -m 'Adiciona algum RecursoIncrivel'`)
4. Push para a branch (`git push origin feature/RecursoIncrivel`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto está licenciado sob a Licença MIT.

---

## 🐛 Solução de Problemas

### Bot não inicia
- Verifique se todas as variáveis de ambiente necessárias no `.env` estão definidas
- Verifique a versão do Node.js com `node --version` (14.0.0+)
- Execute `npm install` para garantir que as dependências estejam instaladas

### Problemas de conexão SFTP
- Verifique as credenciais com um cliente SFTP
- Confirme que o caminho do diretório remoto está correto
- Garanta que o firewall permita conexões SFTP (porta 22)

### Erros de webhook do Discord
- Verifique se as URLs dos webhooks estão corretas e ativas
- Confirme que o canal do webhook ainda existe
- O bot possui tratamento integrado de limite de taxa

Para mais ajuda na solução de problemas, veja [CONFIGURACAO.md](CONFIGURACAO.md#solução-de-problemas).

---

## 🙏 Agradecimentos

- Desenvolvedores do jogo Deadside pelo jogo incrível
- Discord pela sua robusta API de webhooks
- A comunidade open-source pelas excelentes bibliotecas Node.js

---

**Feito com ❤️ para a comunidade Deadside**
