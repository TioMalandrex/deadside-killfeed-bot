# 📚 Funcionalidades e Comandos do Bot

## Visão Geral

O Bot Deadside Killfeed é um sistema automatizado que monitora logs de servidor e publica notificações ricas no Discord. Este documento explica em detalhes todas as funcionalidades disponíveis.

---

## 🎯 Funcionalidades Principais

### 1. 🔫 Killfeed em Tempo Real

**O que faz:**
- Monitora kills de jogadores em tempo real
- Publica notificações imediatas no Discord
- Exibe informações detalhadas de cada kill

**Informações mostradas:**
- Nome do killer (jogador que matou)
- Nome da vítima (jogador que morreu)
- Arma utilizada
- Distância do tiro (em metros)
- Servidor onde ocorreu
- Hora exata do kill

**Exemplo de mensagem:**
```
💀 JoãoGamer eliminou PedroNoob com Mosin (217m)
⏰ 15:34:22 | Servidor: 3X BR
```

**Frases rotativas:**
O bot usa frases variadas para manter as mensagens interessantes:
- "eliminou"
- "apagou da existência"
- "enviou para o lobby"
- "destruiu"
- "aniquilou"

---

### 2. 💀 Rastreamento de Mortes

**Tipos de morte rastreados:**

#### Mortes por Jogadores
- Contabiliza para estatísticas de K/D
- Mostra no placar de kills
- Reseta sequências de eliminações

#### Mortes Ambientais (Suicídios)
- Queda de altura
- Afogamento
- Radiação
- Zona letal
- Auto-dano

**Exemplo de notificação de suicídio:**
```
💥 MarcosPro morreu de Queda (15m)
😅 Ops! Cuidado na próxima vez!
```

---

### 3. 🎯 Tiros Longos (Longshots)

**Critério:** Kills acima de 200 metros

**O que acontece:**
- Kill é destacado como "Tiro Longo"
- Registrado no ranking de longshots
- Notificação especial no Discord

**Informações do ranking:**
- Top 100 longshots por período
- Distância exata
- Arma utilizada
- Data/hora do tiro

**Exemplo:**
```
🎯 TIRO LONGO! 
Fernando → Carlos @ 487m com Mosin
🏆 Novo recorde pessoal!
```

**Rankings de Longshots:**
- Diário: Top longshots do dia
- Semanal: Top longshots da semana
- Mensal: Top longshots do mês
- Todos os Tempos: Maiores tiros de sempre

---

### 4. ⚡ Sistema de Sequências (Killstreaks)

**Como funciona:**
- Contador inicia no primeiro kill
- Incrementa a cada kill adicional
- Reseta quando jogador morre

**Marcos de sequência anunciados:**
```
3 kills   → "Sequência iniciada!"
5 kills   → "Em chamas!"
7 kills   → "Dominando!"
10 kills  → "Imparável!"
15 kills  → "Deus da Guerra!"
20 kills  → "Lendário!"
25 kills  → "Mítico!"
30+ kills → "EXTERMINADOR!"
```

**Exemplo de notificação:**
```
⚡ SEQUÊNCIA DE ELIMINAÇÕES!
RafaelPro está IMPARÁVEL com 10 kills!
🔥 Melhor sequência: 32 kills
```

**Fim de sequência:**
Quando uma sequência ≥3 termina:
```
💔 Sequência Terminada!
BrunoGamer encerrou a sequência de 
RafaelPro de 10 kills!
```

**Sequência por morte ambiental:**
```
⚡ Sequência Terminada!
RafaelPro perdeu sua sequência de 10 kills
por Queda!
```

---

### 5. 📊 Placares (Leaderboards)

O bot mantém 4 tipos de placares diferentes:

#### 📅 Placar Diário
- Reinicia todo dia à meia-noite
- Mostra top 10 jogadores do dia
- Atualizado automaticamente

#### 📆 Placar Semanal
- Reinicia toda segunda-feira
- Top 10 da semana
- Formato: Semana 01, 02, etc.

#### 📆 Placar Mensal
- Reinicia no primeiro dia do mês
- Top 10 do mês
- Formato: Janeiro, Fevereiro, etc.

#### 🏆 Placar de Todos os Tempos
- Nunca reseta
- Estatísticas desde sempre
- Top 10 jogadores históricos

**Informações em cada placar:**
```
🏆 Placar Semanal - 3X BR

1. 👑 RafaelPro
   Kills: 247 | Mortes: 89 | K/D: 2.78
   Mortes Ambientais: 5
   
2. ⭐ BrunoGamer  
   Kills: 198 | Mortes: 102 | K/D: 1.94
   Mortes Ambientais: 3
   
3. 🔥 CarlosSniper
   Kills: 156 | Mortes: 78 | K/D: 2.00
   Mortes Ambientais: 1

━━━━━━━━━━━━━━━━━━━━━━━━
⚡ Top 5 Sequências Ativas

1. RafaelPro: 15 kills (Melhor: 32)
2. BrunoGamer: 7 kills (Melhor: 18)
3. CarlosSniper: 3 kills (Melhor: 12)
```

---

### 6. 🎭 Sistema de Destaque de Jogadores

**Para jogadores VIP/especiais:**

Permite personalizar a aparência de jogadores específicos nas notificações:

**Opções de personalização:**
- **Prefixo:** Texto antes do nome (ex: "💸ASH WAKE💸")
- **Emoji:** Emoji ao lado do nome
- **Cor:** Cor dos embeds do Discord
- **GIF:** GIF animado nos embeds de kill
- **Thumbnail:** Imagem de avatar personalizada

**Exemplo de configuração:**
```json
{
  "RafaelPro": {
    "prefix": "🔥LENDA🔥 ",
    "emoji": "👑",
    "color": "#FFD700",
    "gifUrl": "https://exemplo.com/gif-epico.gif",
    "thumbnailUrl": "https://exemplo.com/avatar.png"
  }
}
```

**Como aparece no Discord:**
```
💀 🔥LENDA🔥 RafaelPro 👑 eliminou CarlosNoob
[GIF animado aparece]
```

---

### 7. 📈 Estatísticas Detalhadas

#### Por Jogador

**Rastreado:**
- Total de kills
- Total de mortes (por jogador)
- Total de mortes ambientais
- Razão K/D (Kill/Death)
- Melhor sequência de kills
- Sequência atual
- Último kill registrado

#### Por Período
- Estatísticas diárias
- Estatísticas semanais  
- Estatísticas mensais
- Estatísticas de todos os tempos

#### Por Servidor
Se você tem múltiplos servidores, estatísticas são separadas por servidor.

---

### 8. 🔔 Sistema de Notificações

O bot envia notificações para diferentes canais do Discord via webhooks:

#### Canais Recomendados:

1. **#killfeed** - Kills em tempo real
2. **#suicídios** - Mortes ambientais
3. **#longshots** - Tiros longos especiais
4. **#sequências** - Anúncios de killstreaks
5. **#placar-diário** - Placar do dia
6. **#placar-semanal** - Placar da semana
7. **#placar-mensal** - Placar do mês
8. **#placar-geral** - Placar de todos os tempos
9. **#estatísticas** - Stats gerais dos jogadores

**Você pode usar o mesmo canal para tudo ou separar como preferir!**

---

### 9. 🔄 Rotação de Frases

Para manter as mensagens interessantes, o bot usa frases diferentes:

#### Frases de Kill:
- "{killer} eliminou {victim}"
- "{killer} apagou {victim} da existência"
- "{killer} enviou {victim} para o lobby"
- "{killer} destruiu {victim}"
- "{killer} dominou {victim}"

#### Frases de Longshot:
- "🎯 TIRO LONGO! {killer} acertou {victim} @ {distance}m"
- "🎯 Sniper de elite! {killer} → {victim} de {distance}m"
- "🎯 Tiro impossível! {killer} eliminou {victim} a {distance}m"

#### Frases de Suicídio:
- "{victim} morreu de {cause}"
- "{victim} se auto-eliminou ({cause})"
- "Ops! {victim} caiu ({cause})"

---

### 10. 💾 Persistência de Dados

**Arquivos salvos automaticamente:**

- `player-stats.json` - Estatísticas completas
- `killstreaks.json` - Sequências ativas
- `longshots.json` - Ranking de longshots
- `seen-lines.json` - Controle de duplicatas
- `message-indexes.json` - Rotação de frases

**Backups automáticos:**
- Arquivo `.backup` criado antes de cada salvamento
- Gravação atômica para prevenir corrupção
- Recuperação automática em caso de erro

**Limpeza automática:**
- Dados diários: 30 dias
- Dados semanais: 12 semanas
- Dados mensais: 12 meses
- Dados de todos os tempos: Permanentes

---

### 11. 🏥 Monitoramento e Saúde

#### Endpoint de Saúde

**URL:** `http://localhost:3000/health`

**Resposta:**
```json
{
  "status": "ok",
  "uptime": 86400,
  "timestamp": "2024-02-18T16:00:00.000Z"
}
```

**Use para:**
- Verificar se bot está online
- Monitorar uptime
- Integrar com sistemas de monitoramento

---

### 12. 🛡️ Proteção e Segurança

**Rate Limiting:**
- Fila de mensagens para evitar ban do Discord
- Respeita limites de taxa da API
- Retry automático em caso de erro

**Validação de Dados:**
- Nomes de jogadores validados
- Distâncias verificadas
- Previne duplicatas
- Sanitização de entrada

**Tratamento de Erros:**
- Logs detalhados de erros
- Continuação automática após erros
- Reconexão SFTP automática
- Sem perda de dados

---

## 🎮 Casos de Uso Práticos

### Para Administradores de Servidor

1. **Monitorar atividade:**
   - Veja quem está jogando
   - Identifique jogadores ativos
   - Monitore padrões de jogo

2. **Engajar comunidade:**
   - Crie competições
   - Recompense top jogadores
   - Celebre conquistas

3. **Detectar problemas:**
   - Identifique possíveis hackers
   - Veja padrões anormais
   - Monitore mortes suspeitas

### Para Jogadores

1. **Acompanhar progresso:**
   - Veja suas estatísticas
   - Compare com outros
   - Estabeleça metas

2. **Competir:**
   - Tente chegar ao topo do placar
   - Quebre recordes de longshot
   - Mantenha sequências longas

3. **Socializar:**
   - Celebre kills épicos
   - Ria de mortes engraçadas
   - Compartilhe momentos

---

## 🔧 Personalização

### Ajustar Frequência de Placares

O bot publica placares automaticamente. Para ajustar:

1. **Diário:** Publicado à meia-noite
2. **Semanal:** Publicado segunda-feira
3. **Mensal:** Publicado dia 1 do mês

### Customizar Mensagens

Edite as frases no código para personalizar:
```javascript
const KILL_PHRASES = [
  "sua frase aqui",
  "outra frase legal"
];
```

### Adicionar Jogadores Destacados

Crie/edite `highlighted-players.json`:
```json
{
  "SeuNick": {
    "prefix": "👑ADMIN👑 ",
    "emoji": "⚡",
    "color": "#FF0000"
  }
}
```

---

## ❓ Perguntas Frequentes

**P: O bot funciona 24/7?**
R: Sim! Uma vez iniciado, ele monitora continuamente.

**P: Quantos servidores posso monitorar?**
R: Atualmente, um servidor por instância do bot. Para múltiplos servidores, rode múltiplas instâncias.

**P: Os dados são perdidos se o bot reiniciar?**
R: Não! Tudo é salvo em arquivos JSON com backup automático.

**P: Posso usar um canal só para tudo?**
R: Sim! Configure todos os webhooks com a mesma URL.

**P: Como faço para destacar meu nick?**
R: Crie o arquivo `highlighted-players.json` conforme documentado acima.

**P: O bot mostra headshots?**
R: Se o log do servidor incluir essa informação, sim. Depende do formato do log.

**P: Posso desativar certas notificações?**
R: Sim! Não configure o webhook para notificações que não deseja.

**P: Quanto espaço em disco o bot usa?**
R: Muito pouco! Os arquivos JSON são pequenos (alguns KB).

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte [CONFIGURACAO.md](CONFIGURACAO.md)
2. Veja [SEGURANCA.md](SEGURANCA.md)
3. Leia [ESQUEMA_DADOS.md](ESQUEMA_DADOS.md)
4. Abra uma issue no GitHub

---

**Desenvolvido com ❤️ para a comunidade Deadside brasileira!**
