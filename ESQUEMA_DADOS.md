# Documentação do Esquema de Dados

> 🇧🇷 **Esta é a versão em Português Brasileiro da documentação.**  
> 🇺🇸 **[English version (DATA_SCHEMA.md)](DATA_SCHEMA.md)**

Este documento descreve a estrutura de todos os arquivos de dados JSON usados pelo Bot Deadside Killfeed.

## Visão Geral

O bot persiste dados em formato JSON para rastrear estatísticas de jogadores, sequências de eliminações, tiros longos e estado do sistema. Todos os arquivos são armazenados no diretório raiz do bot e são criados automaticamente na primeira execução.

---

## Arquivo: `player-stats.json`

**Propósito**: Rastreia estatísticas abrangentes de jogadores em diferentes períodos de tempo.

### Estrutura

```json
{
  "all_time": {
    "NomeDoJogador": {
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
      "NomeDoJogador": {
        "kills": 45,
        "deaths": 12,
        "envDeaths": 2,
        "kd": 3.75,
        "servers": { /* mesma estrutura */ }
      }
    }
  },
  "weekly": {
    "2024-W01": {
      "NomeDoJogador": { /* mesma estrutura */ }
    }
  },
  "monthly": {
    "2024-01": {
      "NomeDoJogador": { /* mesma estrutura */ }
    }
  }
}
```

### Descrição dos Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `kills` | Number | Número de kills (mortes causadas por jogador) |
| `deaths` | Number | Número de mortes causadas por jogador |
| `envDeaths` | Number | Número de mortes ambientais/suicídios |
| `kd` | Number | Razão Kill/Death (exclui mortes ambientais) |
| `servers` | Object | Estatísticas por servidor (opcional) |

### Chaves de Período de Tempo

- **Diário**: Formato `YYYY-MM-DD` (ex: "2024-01-15")
- **Semanal**: Formato `YYYY-WNN` (ex: "2024-W03")
- **Mensal**: Formato `YYYY-MM` (ex: "2024-01")

### Notas

- Razão K/D considera apenas mortes causadas por jogador, não mortes ambientais
- Quando mortes = 0, K/D é definido como o número de kills (representando K/D infinito)
- Dados antigos (>30 dias para diário, >12 semanas para semanal, >12 meses para mensal) são limpos automaticamente

---

## Arquivo: `killstreaks.json`

**Propósito**: Rastreia sequências de eliminações ativas e melhores sequências para cada jogador.

### Estrutura

```json
{
  "NomeDoJogador": {
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

### Descrição dos Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `count` | Number | Contagem atual da sequência de eliminações ativa |
| `bestStreak` | Number | Maior sequência de eliminações já alcançada |
| `lastKill` | String | Timestamp ISO 8601 do kill mais recente |
| `servers` | Object | Dados de sequência por servidor (opcional) |

### Comportamento

- `count` é redefinido para 0 quando o jogador morre (por jogador ou ambiente)
- `bestStreak` nunca é redefinido, apenas atualizado se a sequência atual exceder
- Marcos de sequência de eliminações (3, 5, 7, 10, 15, 20, 25, 30+) acionam embeds do Discord
- Sequências ≥3 que terminam acionam embeds de "Sequência Terminada"

---

## Arquivo: `longshots.json`

**Propósito**: Rastreia kills de longa distância (≥200m) em períodos de tempo.

### Estrutura

```json
{
  "all_time": [
    {
      "killer": "JogadorUm",
      "victim": "JogadorDois",
      "distance": 487,
      "weapon": "Mosin",
      "timestamp": "2024-01-15T12:34:56.789Z",
      "serverName": "3X US"
    }
  ],
  "daily": {
    "2024-01-15": [
      { /* mesma estrutura acima */ }
    ]
  },
  "weekly": {
    "2024-W03": [
      { /* mesma estrutura acima */ }
    ]
  },
  "monthly": {
    "2024-01": [
      { /* mesma estrutura acima */ }
    ]
  }
}
```

### Descrição dos Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `killer` | String | Nome do jogador que fez o kill |
| `victim` | String | Nome do jogador que foi morto |
| `distance` | Number | Distância em metros (inteiro) |
| `weapon` | String | Arma/causa da morte |
| `timestamp` | String | Timestamp ISO 8601 do kill |
| `serverName` | String | Servidor onde o kill ocorreu (opcional) |

### Notas

- Apenas kills ≥200m são rastreados
- Arrays são ordenados por distância (decrescente)
- Limitado aos 100 melhores tiros longos por período para eficiência de memória
- Prevenção de duplicatas: kills idênticos (mesmo killer, victim, distância, arma, timestamp) são pulados

---

## Arquivo: `seen-lines.json`

**Propósito**: Previne processamento duplicado de linhas de log.

### Estrutura

```json
[
  "hash_da_linha_de_log_1",
  "hash_da_linha_de_log_2",
  "hash_da_linha_de_log_3"
]
```

### Descrição

- Array de identificadores únicos (hashes) para linhas de log processadas
- Previne que o bot processe o mesmo kill/morte múltiplas vezes
- Limpo periodicamente para prevenir crescimento ilimitado
- Não é legível por humanos; usado apenas internamente

---

## Arquivo: `message-indexes.json`

**Propósito**: Rastreia índices de rotação para frases de kill/tiro longo/suicídio.

### Estrutura

```json
{
  "killPhraseIndex": 5,
  "longshotPhraseIndex": 2,
  "suicidePhraseIndex": 8
}
```

### Descrição dos Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `killPhraseIndex` | Number | Índice da última frase de kill usada |
| `longshotPhraseIndex` | Number | Índice da última frase de tiro longo usada |
| `suicidePhraseIndex` | Number | Índice da última frase de suicídio usada |

### Comportamento

- Índices incrementam com cada mensagem para rotacionar pelas frases
- Volta para 0 quando o fim do array de frases é alcançado
- Fornece variedade nas descrições dos embeds do Discord

---

## Arquivo: `highlighted-players.json`

**Propósito**: Estilização personalizada para jogadores específicos (opcional, criado manualmente).

### Estrutura

```json
{
  "NomeDoJogador": {
    "prefix": "💸ASH WAKE💸 ",
    "emoji": "💸",
    "color": "#FFD700",
    "gifUrl": "https://example.com/destaque.gif",
    "thumbnailUrl": "https://example.com/avatar.png"
  },
  "OutroJogador": {
    "prefix": "🔥LENDA🔥 ",
    "emoji": "🔥",
    "color": "#FF0000"
  }
}
```

### Descrição dos Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `prefix` | String | Não | Prefixo de texto antes do nome do jogador |
| `emoji` | String | Não | Emoji para exibir com o nome do jogador |
| `color` | String | Não | Cor hexadecimal para embeds do jogador |
| `gifUrl` | String | Não | URL para GIF em embeds de kill |
| `thumbnailUrl` | String | Não | URL para imagem de miniatura |

### Notas

- Todos os campos são opcionais
- Se não especificado, formatação padrão é usada
- Usado em embeds de kill, placares e notificações de sequência
- Deve ser criado manualmente; bot não modifica este arquivo

---

## Arquivo: `leaderboard.json` (Legado)

**Propósito**: Formato de placar legado (mantido para compatibilidade retroativa).

### Estrutura

```json
{
  "all_time": {
    "NomeDoJogador": {
      "kills": 247,
      "deaths": 89
    }
  }
}
```

### Notas

- Substituído por `player-stats.json`
- Não é mais usado ativamente na versão atual
- Pode ser removido em releases futuros

---

## Formato de Log CSV Esperado

O bot espera logs do servidor Deadside em formato CSV com a seguinte estrutura:

### Formato

```csv
timestamp,id_killer,nome_killer,id_victim,nome_victim,arma,distancia,dados_extras
```

### Exemplo

```csv
2024-01-15 12:34:56,76561198012345678,JogadorUm,76561198087654321,JogadorDois,Mosin,217,headshot
2024-01-15 12:35:10,76561198087654321,JogadorDois,76561198087654321,JogadorDois,Falling,0,suicide
```

### Descrição das Colunas

| Coluna | Índice | Descrição | Exemplo |
|--------|--------|-----------|---------|
| Timestamp | 0 | Data e hora do evento | `2024-01-15 12:34:56` |
| ID Killer | 1 | Steam ID do killer (não usado) | `76561198012345678` |
| Nome Killer | 2 | Nome no jogo do killer | `JogadorUm` |
| ID Victim | 3 | Steam ID da vítima (não usado) | `76561198087654321` |
| Nome Victim | 4 | Nome no jogo da vítima | `JogadorDois` |
| Arma/Causa | 5 | Arma ou causa da morte | `Mosin` ou `Falling` |
| Distância | 6 | Distância em metros | `217` |
| Dados Extras | 7+ | Campos adicionais (não usados) | `headshot` |

### Casos Especiais

- **Suicídio**: Nome do killer = Nome da vítima
- **Morte Ambiental**: Arma contém `suicide`, `falling`, ou `relocation`
- **Tiro Longo**: Distância ≥ 200

---

## Arquivos de Backup

O bot cria arquivos de backup automáticos ao salvar dados:

| Arquivo Original | Arquivo de Backup | Arquivo Temporário |
|-----------------|-------------------|-------------------|
| `player-stats.json` | `player-stats.json.backup` | `player-stats.json.tmp` |
| `killstreaks.json` | `killstreaks.json.backup` | `killstreaks.json.tmp` |
| `longshots.json` | `longshots.json.backup` | `longshots.json.tmp` |
| `seen-lines.json` | `seen-lines.json.backup` | `seen-lines.json.tmp` |
| `message-indexes.json` | `message-indexes.json.backup` | `message-indexes.json.tmp` |

### Processo de Backup

1. Dados são gravados no arquivo `.tmp`
2. Se o arquivo original existe, é copiado para `.backup`
3. Arquivo `.tmp` é renomeado atomicamente para nome do arquivo original
4. Se a gravação falhar, `.tmp` é limpo e `.backup` permanece intacto

---

## Retenção de Dados

O bot limpa automaticamente dados antigos para prevenir crescimento ilimitado:

| Tipo de Dados | Período de Retenção |
|--------------|---------------------|
| Estatísticas diárias | 30 dias |
| Estatísticas semanais | 12 semanas |
| Estatísticas mensais | 12 meses |
| Estatísticas de todos os tempos | Para sempre |
| Tiros longos | Top 100 por período |
| Sequências de eliminações | Para sempre (ativa + melhor) |
| Linhas vistas | Limpo periodicamente |

---

## Gerenciamento Manual de Dados

### Visualizando Dados

Todos os arquivos são JSON legível por humanos. Você pode visualizá-los com qualquer editor de texto:

```bash
cat player-stats.json | jq '.'
```

### Redefinindo Dados

Para redefinir todas as estatísticas:

```bash
rm player-stats.json killstreaks.json longshots.json seen-lines.json
```

O bot recriará estes arquivos na próxima execução.

### Restaurando do Backup

Se os dados estiverem corrompidos:

```bash
cp player-stats.json.backup player-stats.json
```

### Exportando Dados

Para exportar estatísticas para análise:

```bash
# Pretty-print JSON
cat player-stats.json | jq '.' > stats-export.json

# Extrair dados específicos
cat player-stats.json | jq '.all_time | to_entries[] | {name: .key, kills: .value.kills, kd: .value.kd}' > players.json
```

---

## Versão do Esquema

Versão atual do esquema: **1.1**

Última atualização: Janeiro de 2024

Mudanças da versão 1.0:
- Adicionado campo `envDeaths` às estatísticas de jogadores
- Adicionado campo `bestStreak` às sequências de eliminações
- Adicionada prevenção de duplicatas aos tiros longos
- Descontinuado `leaderboard.json` em favor de `player-stats.json`
