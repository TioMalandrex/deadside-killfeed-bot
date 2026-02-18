const SftpClient = require('ssh2-sftp-client');
const axios = require('axios');
const { parse } = require('csv-parse');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

// Adiciona os manipuladores de erros globais aqui
process.on('uncaughtException', (err) => {
  console.error('❌ Exceção não capturada:', err.message);
  console.log('🔄 O script continuará executando e tentará novamente no próximo ciclo');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rejeição não tratada em:', promise);
  console.error('💬 Razão:', reason);
  console.log('🔄 O script continuará executando e tentará novamente no próximo ciclo');
});

/**
 * =========================================
 * RASTREAMENTO DE KILLFEED E LEADERBOARD DO DEADSIDE
 * =========================================
 * Integração aprimorada do Discord para servidores Deadside
 * Com visuais profissionais e embeds ricos
 */

// === CONFIGURAÇÕES DO SERVIDOR ===
// Configuração agora carregada das variáveis de ambiente (arquivo .env)
// Veja .env.example para as variáveis necessárias
const serverConfigs = [
  {
    host: process.env.SFTP_HOST,
    port: parseInt(process.env.SFTP_PORT) || 22,
    username: process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASSWORD,
    remoteDir: process.env.SFTP_REMOTE_DIR,
    killWebhook: process.env.DISCORD_KILL_WEBHOOK,
    suicideWebhook: process.env.DISCORD_SUICIDE_WEBHOOK,
    leaderboardWebhook: process.env.DISCORD_LEADERBOARD_WEBHOOK,
    dailyLeaderboardWebhook: process.env.DISCORD_DAILY_LEADERBOARD_WEBHOOK,
    weeklyLeaderboardWebhook: process.env.DISCORD_WEEKLY_LEADERBOARD_WEBHOOK,
    monthlyLeaderboardWebhook: process.env.DISCORD_MONTHLY_LEADERBOARD_WEBHOOK,
    allTimeLeaderboardWebhook: process.env.DISCORD_ALLTIME_LEADERBOARD_WEBHOOK,
    longshotWebhook: process.env.DISCORD_LONGSHOT_WEBHOOK,
    allPlayersStatsWebhook: process.env.DISCORD_ALL_PLAYERS_STATS_WEBHOOK,
    serverName: process.env.SERVER_NAME || "3X US",
    color: process.env.SERVER_COLOR || "#00FF00",
    iconUrl: process.env.SERVER_ICON_URL,
    // Opções de conexão SFTP
    connectOptions: {
      readyTimeout: 30000, // Timeout de 30 segundos para conexões SFTP
      keepaliveInterval: 10000 // Envia keepalive a cada 10 segundos
    }
  }
];

// === ARQUIVOS DE MEMÓRIA ===
const MEMORY_FILE = 'seen-lines.json';
const LEADERBOARD_FILE = 'leaderboard.json'; // Legado - mantendo para compatibilidade retroativa
const STATS_FILE = 'player-stats.json'; // Novo formato para estatísticas de jogadores
const LONGSHOTS_FILE = 'longshots.json'; // Para rastrear abates de longa distância
const KILLSTREAKS_FILE = 'killstreaks.json'; // Para rastrear sequências de abates
const MESSAGE_INDEXES_FILE = 'message-indexes.json'; // Para rastrear os últimos índices de mensagem usados

// === RATE LIMITS ===
const RATE_LIMITS = {
  // Track rate limits for each webhook URL
  webhooks: {},
  // Global queue for messages to avoid hitting rate limits
  queue: [],
  // Is the queue processor running?
  processing: false
};

// Load data (properly load from files instead of resetting)
let seenLines = loadSeenLines(); // Load previously seen lines
let leaderboards = loadLeaderboards(); // Load leaderboards
let playerStats = loadPlayerStats(); // Load player stats
let longshots = loadLongshots(); // Load longshots
let activeKillstreaks = loadKillstreaks(); // Load killstreaks
let messageIndexes = loadMessageIndexes(); // Load message indexes

console.log(`📊 Carregadas ${seenLines.size} linhas vistas anteriormente`);
console.log(`📊 Carregados ${Object.keys(playerStats.all_time).length} registros de jogadores de todos os tempos`);

console.log(`📊 Carregadas ${Object.keys(activeKillstreaks).length} sequências de abates ativas`);
setTimeout(logActiveKillstreaks, 3000); // Log active killstreaks after startup
// === EMBED TEMPLATES ===

// These templates will be used for Discord's rich embeds
const EMBED_TEMPLATES = {
  // Kill notification embed
  kill: {
    title: "{emoji} {killer} eliminated {victim}",
    color: null, // Will be set from server config
    description: null, // Will be generated from kill phrase
    thumbnail: { url: "{weaponIcon}" },
    image: { url: null }, // CHANGED: Use an object with null URL
    fields: [
      { name: "Weapon", value: "{weapon}", inline: true },
      { name: "Distance", value: "{distance}m", inline: true }
    ],
    footer: { 
      text: "{serverName}", 
      icon_url: "{serverIcon}" 
    },
    timestamp: new Date().toISOString()
  },
  
  // Suicide notification embed
  suicide: {
    title: "{emoji} {victim} died",
    color: "#DD3333", // Red color for suicides
    description: null, // Will be generated from suicide phrase
    thumbnail: { url: "https://i.imgur.com/6guD1s3.png" },
    image: { url: null }, // CHANGED: Use an object with null URL
    footer: { 
      text: "{serverName}", 
      icon_url: "{serverIcon}" 
    },
    timestamp: new Date().toISOString()
  },
  
  // Killstreak notification embed
  killstreak: {
    title: "⚡ Killstreak Alert!",
    color: "#FFAA00", // Orange color for killstreaks
    description: "**{player}** {milestone} ({count} kills)",
    thumbnail: { url: "https://i.imgur.com/6guD1s3.png" },
    image: { url: null }, // CHANGED: Use an object with null URL
    footer: { 
      text: "{serverName}", 
      icon_url: "{serverIcon}" 
    },
    timestamp: new Date().toISOString()
  },
  
  // Longshot embed template
  longshot: {
    title: "🎯 Incredible Long-range Kill!",
    color: "#AA33AA", // Purple color for longshots
    description: null, // Will be generated from longshot phrase
    fields: [
      { name: "Distance", value: "**{distance}m**", inline: true },
      { name: "Weapon", value: "{weapon}", inline: true }
    ],
    thumbnail: { url: "https://i.imgur.com/6guD1s3.png" },
    image: { url: null }, // CHANGED: Use an object with null URL
    footer: { 
      text: "{serverName}", 
      icon_url: "{serverIcon}" 
    },
    timestamp: new Date().toISOString()
  }
};

// === HELPER: RETRY FUNCTION ===
async function retryAsync(fn, retries = 3, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i < retries - 1) {
        console.warn(`⚠️ Retry ${i + 1} after error: ${err.message}`);
        await new Promise(res => setTimeout(res, delayMs));
      } else {
        throw err;
      }
    }
  }
}
// === HIGHLIGHTED PLAYERS CONFIG ===
const HIGHLIGHTED_PLAYERS = {
  "JeffBezzoss": { 
    color: "#FFD700", // Gold color
    prefix: "💸ASH WAKE💸 ", // Prefix to add before the name
    emoji: "💸", // Emoji for additional highlighting
    gifUrl: "https://i.imgur.com/UyD4yBI.png", // ASH WAKE GIF
    thumbnailUrl: "https://i.imgur.com/BXUz0Sv.png" // Default thumbnail image
  },
  "YouLackSkill": { 
    color: "#FFD700", // Gold color
    prefix: "💸ASH WAKE💸 ", // Prefix to add before the name
    emoji: "💸", // Emoji for additional highlighting
    gifUrl: "https://i.imgur.com/UyD4yBI.png", // ASH WAKE GIF
    thumbnailUrl: "https://i.imgur.com/BXUz0Sv.png" // Default thumbnail image
  },
  "XGrimReaperX252": { 
    color: "#FFD700", // Gold color
    prefix: "💸ASH WAKE💸 ", // Prefix to add before the name
    emoji: "💸", // Emoji for additional highlighting
    gifUrl: "https://i.imgur.com/UyD4yBI.png", // ASH WAKE GIF
    thumbnailUrl: "https://i.imgur.com/BXUz0Sv.png" // Default thumbnail image
  },
  "ELM HayzEe": { 
    color: "#FFD700",
    prefix: "💸ASH WAKE💸 ",
    emoji: "💸",
    gifUrl: "https://i.imgur.com/UyD4yBI.png",
    thumbnailUrl: "https://i.imgur.com/BXUz0Sv.png" // Default thumbnail image
  },
  "Dacowmonster707": { 
    color: "#FFD700",
    prefix: "💸ASH WAKE💸 ",
    emoji: "💸",
    gifUrl: "https://i.imgur.com/UyD4yBI.png",
    thumbnailUrl: "https://i.imgur.com/BXUz0Sv.png" // Default thumbnail image
  },
  "ZIGGIDY3": {
    color: "#FF7700",
    prefix: "⚰️DEAD MARSHALL⚰️ ", 
    emoji: "⚰️",
    gifUrl: "https://i.imgur.com/N77b4FA.png",
    thumbnailUrl: "https://i.imgur.com/6guD1s3.png" // Default thumbnail image
  },
  "ELM Juicy": {
    color: "#FF7700",
    prefix: "⚰️DEAD MARSHALL⚰️ ",
    emoji: "⚰️",
    gifUrl: "https://i.imgur.com/N77b4FA.png",
    thumbnailUrl: "https://i.imgur.com/6guD1s3.png" // Default thumbnail image
  },
  "SogftPuncake": {
    color: "#FF7700",
    prefix: "⚰️DEAD MARSHALL⚰️ ",
    emoji: "⚰️",
    gifUrl: "https://i.imgur.com/N77b4FA.png",
    thumbnailUrl: "https://i.imgur.com/6guD1s3.png" // Default thumbnail image
  },
  "Rag3xHades-": {
    color: "#FF7700",
    prefix: "⚰️DEAD MARSHALL⚰️ ", 
    emoji: "⚰️",
    gifUrl: "https://i.imgur.com/N77b4FA.png",
    thumbnailUrl: "https://i.imgur.com/6guD1s3.png" // Default thumbnail image
  },
  "TA Destiny": {
    color: "#FF7700",
    prefix: "⚰️DEAD MARSHALL⚰️ ", 
    emoji: "⚰️",
    gifUrl: "https://i.imgur.com/N77b4FA.png",
    thumbnailUrl: "https://i.imgur.com/6guD1s3.png" // Default thumbnail image
  }
};

// Add this constant with your other file constants
const HIGHLIGHTED_PLAYERS_FILE = 'highlighted-players.json';
// Function to check if a player is highlighted
function isHighlightedPlayer(playerName) {
  return HIGHLIGHTED_PLAYERS.hasOwnProperty(playerName);
}

// Function to get player highlight info
function getPlayerHighlight(playerName) {
  return HIGHLIGHTED_PLAYERS[playerName] || null;
}

// Function to format player name with highlight if applicable
function formatPlayerName(playerName) {
  const highlight = getPlayerHighlight(playerName);
  
  if (highlight) {
    // Apply the role prefix and emoji highlighting
    return `${highlight.prefix}**${playerName}** ${highlight.emoji}`;
  }
  
  // Regular player just gets bold formatting
  return `**${playerName}**`;
}

// Functions to save and load highlighted players
function saveHighlightedPlayers() {
  try {
    fs.writeFileSync(HIGHLIGHTED_PLAYERS_FILE, JSON.stringify(HIGHLIGHTED_PLAYERS));
    console.log('✅ Configuração de jogadores em destaque salva.');
  } catch (err) {
    console.error('❌ Falha ao salvar jogadores em destaque:', err.message);
  }
}

function loadHighlightedPlayers() {
  try {
    // Store a copy of your code-defined players
    const codeDefinedPlayers = JSON.parse(JSON.stringify(HIGHLIGHTED_PLAYERS));
    
    // Try to load from file
    const data = fs.readFileSync(HIGHLIGHTED_PLAYERS_FILE);
    const loaded = JSON.parse(data);
    
    // Clear current config to start fresh
    for (const player in HIGHLIGHTED_PLAYERS) {
      delete HIGHLIGHTED_PLAYERS[player];
    }
    
    // Add all code-defined players back first
    for (const player in codeDefinedPlayers) {
      HIGHLIGHTED_PLAYERS[player] = codeDefinedPlayers[player];
    }
    
    // Only update players that exist in our code
    for (const player in loaded) {
      if (codeDefinedPlayers.hasOwnProperty(player)) {
        // Take file values but ensure required properties exist
        HIGHLIGHTED_PLAYERS[player] = loaded[player];
        
        // Make sure gifUrl is set
        if (!HIGHLIGHTED_PLAYERS[player].gifUrl) {
          console.log(`⚠️ Fixing missing gifUrl for ${player}`);
          HIGHLIGHTED_PLAYERS[player].gifUrl = codeDefinedPlayers[player].gifUrl;
        }
        
        // Make sure thumbnailUrl is set
        if (!HIGHLIGHTED_PLAYERS[player].thumbnailUrl) {
          console.log(`⚠️ Fixing missing thumbnailUrl for ${player}`);
          HIGHLIGHTED_PLAYERS[player].thumbnailUrl = codeDefinedPlayers[player].thumbnailUrl;
        }
      }
    }
    
    console.log('✅ Configuração de jogadores em destaque carregada.');
    
    // Save the fixed configuration back to file
    saveHighlightedPlayers();
  } catch (err) {
    console.log('ℹ️ Nenhum arquivo de jogadores em destaque encontrado ou erro ao ler. Usando padrões.');
    saveHighlightedPlayers(); // Create the file with defaults
  }
}
// Function to clean up and reset highlighted players to code defaults
function resetHighlightedPlayers() {
  console.log('🧹 Resetting highlighted players to code defaults...');
  
  try {
    // Delete the saved file first
    fs.unlinkSync(HIGHLIGHTED_PLAYERS_FILE);
    console.log('✅ Deleted saved highlighted players file');
  } catch (err) {
    console.log('ℹ️ Nenhum arquivo para deletar ou erro ao deletar');
  }
  
  // Run validation to show current state
  validateHighlightedPlayerUrls();
  
  // Save with current code defaults
  saveHighlightedPlayers();
  console.log('✅ Reset highlighted players completed');
}
// Add a function to check for thumbnail URLs in the HIGHLIGHTED_PLAYERS object
function checkHighlightedPlayersThumbnails() {
  console.log('🔍 Checking highlighted players Thumbnail URLs:');
  for (const player in HIGHLIGHTED_PLAYERS) {
    const highlight = HIGHLIGHTED_PLAYERS[player];
    if (highlight.thumbnailUrl) {
      console.log(`✅ ${player} has Thumbnail URL: ${highlight.thumbnailUrl}`);
    } else {
      console.log(`⚠️ ${player} is missing Thumbnail URL - will use GIF or weapon icon`);
    }
  }
}
function checkHighlightedPlayersGifs() {
  console.log('🔍 Checking highlighted players GIF URLs:');
  for (const player in HIGHLIGHTED_PLAYERS) {
    const highlight = HIGHLIGHTED_PLAYERS[player];
    if (highlight.gifUrl) {
      console.log(`✅ ${player} has GIF URL: ${highlight.gifUrl}`);
    } else {
      console.log(`❌ ${player} is missing GIF URL!`);
    }
  }
}
// Call this function during initialization along with the GIF check
setTimeout(() => {
  checkHighlightedPlayersGifs();
  checkHighlightedPlayersThumbnails();
}, 2000);

// Create a utility function to format dates more nicely
function formatDate(date) {
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(date).toLocaleDateString('en-US', options);
}
// === FRASES PERSONALIZADAS DE ABATE ===
const KILL_PHRASES = [
  "**{killer}** apagou **{victim}** da existência com **{weapon}**{distance}.",
  "**{killer}** mandou **{victim}** de volta pro lobby com **{weapon}**{distance}.",
  "**{killer}** fez **{victim}** se arrepender de ter nascido com **{weapon}**{distance}.",
  "**{killer}** transformou **{victim}** em memória com **{weapon}**{distance}.",
  "**{victim}** não aguentou a pressão de **{killer}** com **{weapon}**{distance}.",
  "**{killer}** eliminou **{victim}** do jogo com **{weapon}**{distance}.",
  "**{victim}** levou das mãos de **{killer}** via **{weapon}**{distance}.",
  "**{killer}** deu a **{victim}** uma passagem só de ida pro respawn com **{weapon}**{distance}.",
  "**{killer}** arruinou toda a carreira de **{victim}** com **{weapon}**{distance}.",
  "**{victim}** foi humilhado por **{killer}** usando **{weapon}**{distance}.",
  "**{killer}** deu boa noite para **{victim}** com **{weapon}**{distance}.",
  "**{killer}** destruiu os sonhos de **{victim}** usando **{weapon}**{distance}.",
  "**{killer}** dobrou **{victim}** como uma cadeira de praia com **{weapon}**{distance}.",
  "**{victim}** foi processado por **{killer}** via **{weapon}**{distance}.",
  "**{killer}** fez **{victim}** desaparecer usando **{weapon}**{distance}.",
  "**{killer}** mandou **{victim}** pra semana que vem com **{weapon}**{distance}.",
  "**{victim}** achou que tinha chance contra a **{weapon}** de **{killer}**{distance}.",
  "**{killer}** derrubou **{victim}** como loot ruim usando **{weapon}**{distance}.",
  "**{killer}** tratou **{victim}** como alvo de treino com **{weapon}**{distance}.",
  "**{killer}** deu a **{victim}** uma viagem grátis pro modo espectador via **{weapon}**{distance}.",
  "**{victim}** foi assado por **{killer}** com **{weapon}**{distance}.",
  "**{victim}** não sobreviveu ao teste de fogo de **{killer}** com **{weapon}**{distance}.",
  "**{killer}** deu voltas em **{victim}** com **{weapon}**{distance}.",
  "**{killer}** expulsou **{victim}** direto do servidor com **{weapon}**{distance}.",
  "**{killer}** mostrou a **{victim}** o verdadeiro significado da dor usando **{weapon}**{distance}."
];

// === FRASES PERSONALIZADAS DE LONGSHOT ===
const LONGSHOT_PHRASES = [
  "**{killer}** acertou **{victim}** tão forte do outro lado do mapa com **{weapon}** ({distance}m), que deu tempo de repensar suas escolhas de vida.",
  "**{victim}** foi snipado por **{killer}** com **{weapon}** ({distance}m) antes mesmo de ouvir o tiro.",
  "**{killer}** apresentou **{victim}** a uma bala de **{weapon}**... do outro lado da cidade ({distance}m).",
  "**{victim}** foi deletado por **{killer}** de um CEP de distância com **{weapon}** ({distance}m).",
  "**{killer}** enviou um pacote direto na testa de **{victim}** com **{weapon}** ({distance}m).",
  "**{victim}** não fazia ideia que **{killer}** já estava escrevendo seu obituário com **{weapon}** ({distance}m).",
  "**{killer}** disse 'segura minha cerveja' e acertou **{victim}** da órbita com **{weapon}** ({distance}m).",
  "**{victim}** acabou de aprender como é perder um 1v1 que nem sabia que estava acontecendo contra a **{weapon}** de **{killer}** ({distance}m).",
  "**{killer}** alinhou o tiro com **{weapon}**, fez uma prece, e terminou a jornada de **{victim}** de ({distance}m).",
  "**{victim}** deveria ter ido pra esquerda quando foi pra direita — **{killer}** estava esperando com **{weapon}** ({distance}m)."
];

// === FRASES PERSONALIZADAS DE SUICÍDIO ===
const SUICIDE_PHRASES = [
  "**{victim}** não aguentou a pressão.",
  "**{victim}** dobrou como uma cadeira de praia.",
  "**{victim}** desapareceu sem deixar rastros.",
  "**{victim}** desistiu cedo demais.",
  "**{victim}** lagou pra fora da existência.",
  "**{victim}** ficou sem sorte.",
  "**{victim}** apertou a tecla errada.",
  "**{victim}** simplesmente desistiu.",
  "**{victim}** esteve aqui... brevemente.",
  "**{victim}** não teve chance.",
  "**{victim}** desconectou emocionalmente primeiro.",
  "**{victim}** rage quit sem o quit.",
  "**{victim}** piscou e perdeu tudo.",
  "**{victim}** entrou em modo espectador.",
  "**{victim}** levou um L inesperado.",
  "**{victim}** aprendeu da maneira difícil.",
  "**{victim}** recebeu um timeout permanente.",
  "**{victim}** encontrou seu páreo — mal.",
  "**{victim}** deixou cair a bolsa.",
  "**{victim}** empacotou cedo.",
  "**{victim}** se desplugou sozinho.",
  "**{victim}** saiu do chat.",
  "**{victim}** ficou AFK pra sempre.",
  "**{victim}** saiu do lobby.",
  "**{victim}** ficou sem opções.",
  "**{victim}** mandou a jogada errada.",
  "**{victim}** cometeu um erro a mais.",
  "**{victim}** dobrou sob pressão.",
  "**{victim}** bateu o ponto.",
  "**{victim}** escorregou pelas rachaduras.",
  "**{victim}** caiu feio.",
  "**{victim}** tinha um trabalho.",
  "**{victim}** pegou o atalho pra saída.",
  "**{victim}** perdeu o rumo.",
  "**{victim}** entendeu errado a missão.",
  "**{victim}** achou a saída cedo.",
  "**{victim}** saiu triste.",
  "**{victim}** foi deixado pra trás.",
  "**{victim}** se aposentou no meio da partida.",
  "**{victim}** perdeu a noção da realidade.",
  "**{victim}** freou tarde demais.",
  "**{victim}** deslogou.",
  "**{victim}** foi sua própria queda.",
  "**{victim}** correu de cabeça pra derrota.",
  "**{victim}** abraçou o vazio.",
  "**{victim}** esqueceu o básico.",
  "**{victim}** foi substituído pela vida.",
  "**{victim}** foi speedrunado pela realidade.",
  "**{victim}** deixou a bola cair.",
  "**{victim}** encarou a realidade — e perdeu."
];

// === MARCOS DE SEQUÊNCIA DE ABATES ===
const KILLSTREAK_MILESTONES = [
  { count: 3, message: "está em uma onda de abates!" },
  { count: 5, message: "está em um massacre!" },
  { count: 7, message: "está dominando!" },
  { count: 10, message: "está imparável!" },
  { count: 15, message: "está divino!" },
  { count: 20, message: "está lendário!" },
  { count: 25, message: "está em um genocídio!" },
  { count: 30, message: "está nuclear!" }
];

// === EMOJIS E ÍCONES DE ARMAS ===
const weaponEmojis = {
  // Facas
  "Improvised Knife": "🔪",
  "Folding Knife": "🔪",
  "Combat Knife": "🔪",

  // Machados
  "Improvised Axe": "🪓",
  "Woodcutter's Axe": "🪓",
  "Fire Axe": "🪓",

  // Pistolas
  "IZH-70": "🔫",
  "TTk": "🔫",
  "F-57": "🔫",
  "C1911": "🔫",
  "berta_m9": "🔫",

  // Espingardas
  "Sawed-Off Shotgun": "💥",
  "IZH-43": "💥",
  "M133": "💥",
  "MS590": "💥",

  // SMGs / Rifles / ARs
  "N4": "🔫",
  "Scorp": "🔫",
  "BB-19": "🔫",
  "UMR45": "🔫",
  "MR5": "🔫",
  "P900": "🔫",
  "pp-3000": "🔫",
  "AK-SU": "🔫",
  "AK-SMG": "🔫",
  "Grom": "🔫",
  "AK-modern": "🔫",
  "Fasam": "🔫",
  "Skar": "🔫",
  "UAG": "🔫",
  "AR4": "🔫",
  "AR4-M": "🔫",
  "RPK-mod": "🔫",
  "MG-36": "🔫",
  "NK417": "🔫",

  // Snipers
  "S85": "🎯",
  "Mosin-K": "🎯",
  "Mosin": "🎯",
  "VSD": "🎯",
  "M99": "🎯",

  // Explosivos
  "GRM-40": "💣",
  "Tripwire F-10": "🧨",
  "Tripwire R-5": "🧨",
  "Stronger Explosive Charge": "💣",
  "Explosive Charge": "💣",
  "Dynamite": "🧨",
  "F-10": "🧨",
  "R-5": "🧨",

  // Veículos Terrestres
  "land_vehicle": "🚗"
};

// URLs de ícones de armas para miniaturas de embeds
const weaponIconURLs = {
  // Categorias de armas padrão
  "default": "https://i.imgur.com/6guD1s3.png",
  "knife": "https://i.imgur.com/6guD1s3.png",
  "axe": "https://i.imgur.com/6guD1s3.png",
  "pistol": "https://i.imgur.com/6guD1s3.png",
  "shotgun": "https://i.imgur.com/6guD1s3.png",
  "smg": "https://i.imgur.com/6guD1s3.png",
  "rifle": "https://i.imgur.com/6guD1s3.png",
  "sniper": "https://i.imgur.com/6guD1s3.png",
  "explosive": "https://i.imgur.com/6guD1s3.png",
  "vehicle": "https://i.imgur.com/6guD1s3.png"
};

// Obtém URL do ícone da arma com base no nome da arma
function getWeaponIconURL(weapon) {
  const weaponLower = weapon.toLowerCase();
  
  if (weaponLower.includes('knife')) return weaponIconURLs.knife;
  if (weaponLower.includes('axe')) return weaponIconURLs.axe;
  if (['izh-70', 'ttk', 'f-57', 'c1911', 'berta_m9'].includes(weaponLower)) return weaponIconURLs.pistol;
  if (weaponLower.includes('shotgun') || ['izh-43', 'm133', 'ms590'].includes(weaponLower)) return weaponIconURLs.shotgun;
  if (['n4', 'scorp', 'bb-19', 'umr45', 'pp-3000'].includes(weaponLower)) return weaponIconURLs.smg;
  if (weaponLower.includes('ak') || ['grom', 'fasam', 'skar', 'uag', 'ar4', 'ar4-m', 'rpk', 'mg-36', 'nk417'].includes(weaponLower)) return weaponIconURLs.rifle;
  if (['s85', 'mosin', 'mosin-k', 'vsd', 'm99'].includes(weaponLower)) return weaponIconURLs.sniper;
  if (weaponLower.includes('explosive') || weaponLower.includes('charge') || weaponLower.includes('tripwire') || weaponLower.includes('dynamite') || ['grm-40', 'f-10', 'r-5'].includes(weaponLower)) return weaponIconURLs.explosive;
  if (weaponLower.includes('vehicle')) return weaponIconURLs.vehicle;
  
  return weaponIconURLs.default;
}

// Obtém a próxima frase de abate com rotação
function getNextKillPhrase() {
  const phrase = KILL_PHRASES[messageIndexes.killPhraseIndex];
  messageIndexes.killPhraseIndex = (messageIndexes.killPhraseIndex + 1) % KILL_PHRASES.length;
  saveMessageIndexes(messageIndexes);
  return phrase;
}

// Obtém a próxima frase de longshot com rotação
function getNextLongshotPhrase() {
  const phrase = LONGSHOT_PHRASES[messageIndexes.longshotPhraseIndex];
  messageIndexes.longshotPhraseIndex = (messageIndexes.longshotPhraseIndex + 1) % LONGSHOT_PHRASES.length;
  saveMessageIndexes(messageIndexes);
  return phrase;
}

// Obtém a próxima frase de suicídio com rotação
function getNextSuicidePhrase() {
  const phrase = SUICIDE_PHRASES[messageIndexes.suicidePhraseIndex];
  messageIndexes.suicidePhraseIndex = (messageIndexes.suicidePhraseIndex + 1) % SUICIDE_PHRASES.length;
  saveMessageIndexes(messageIndexes);
  return phrase;
}
// === DATA MANAGEMENT FUNCTIONS ===

/**
 * Atomic file write with backup to prevent data corruption
 * Writes to a temporary file first, then renames to the target file
 * This ensures the original file is not corrupted if the write fails
 */
function atomicWriteFile(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  const backupPath = `${filePath}.backup`;
  
  try {
    // Write to temporary file first
    fs.writeFileSync(tempPath, data, 'utf8');
    
    // If original file exists, create a backup
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, backupPath);
      } catch (backupErr) {
        console.warn(`⚠️ Não foi possível criar backup para ${filePath}: ${backupErr.message}`);
      }
    }
    
    // Renomeia atomicamente arquivo temp para arquivo alvo
    fs.renameSync(tempPath, filePath);
    
    return true;
  } catch (err) {
    console.error(`❌ Gravação atômica falhou para ${filePath}:`, err.message);
    
    // Limpa arquivo temporário se existir
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (cleanupErr) {
      console.error(`❌ Falha ao limpar arquivo temporário:`, cleanupErr.message);
    }
    
    return false;
  }
}

// Carrega linhas vistas do arquivo
function loadSeenLines() {
  try {
    const data = fs.readFileSync(MEMORY_FILE);
    return new Set(JSON.parse(data));
  } catch {
    console.log('ℹ️ Nenhum arquivo de memória encontrado. Começando do zero.');
    return new Set();
  }
}

// Salva linhas vistas no arquivo
function saveSeenLines(seenLines) {
  try {
    const success = atomicWriteFile(MEMORY_FILE, JSON.stringify([...seenLines]));
    if (success) {
      console.log('✅ Linhas vistas salvas.');
    }
  } catch (err) {
    console.error('❌ Falha ao salvar linhas vistas:', err.message);
  }
}

// Funções de leaderboard legadas - mantendo para compatibilidade retroativa
function loadLeaderboards() {
  try {
    const data = fs.readFileSync(LEADERBOARD_FILE);
    return JSON.parse(data);
  } catch {
    console.log('ℹ️ Nenhum arquivo de leaderboard encontrado. Começando do zero.');
    return {};
  }
}

function saveLeaderboards(leaderboard) {
  try {
    const success = atomicWriteFile(LEADERBOARD_FILE, JSON.stringify(leaderboard));
    if (success) {
      console.log('✅ Leaderboards salvos.');
    }
  } catch (err) {
    console.error('❌ Falha ao salvar leaderboards:', err.message);
  }
}

// Rastreamento de índices de mensagens para rotação de frases
function loadMessageIndexes() {
  try {
    const data = fs.readFileSync(MESSAGE_INDEXES_FILE);
    return JSON.parse(data);
  } catch {
    console.log('ℹ️ Nenhum arquivo de índices de mensagem encontrado. Começando do zero.');
    return {
      killPhraseIndex: 0,
      longshotPhraseIndex: 0,
      suicidePhraseIndex: 0
    };
  }
}

function saveMessageIndexes(indexes) {
  try {
    const success = atomicWriteFile(MESSAGE_INDEXES_FILE, JSON.stringify(indexes));
    if (!success) {
      console.error('❌ Falha ao salvar índices de mensagem');
    }
  } catch (err) {
    console.error('❌ Falha ao salvar índices de mensagem:', err.message);
  }
}

// Gerenciamento de estatísticas de jogadores
function loadPlayerStats() {
  try {
    const data = fs.readFileSync(STATS_FILE);
    return JSON.parse(data);
  } catch {
    console.log('ℹ️ Nenhum arquivo de estatísticas de jogadores encontrado. Começando do zero.');
    return {
      all_time: {},
      daily: {},
      weekly: {},
      monthly: {}
    };
  }
}

function savePlayerStats(stats) {
  try {
    const success = atomicWriteFile(STATS_FILE, JSON.stringify(stats, null, 2));
    if (success) {
      console.log('✅ Estatísticas de jogadores salvas.');
    }
  } catch (err) {
    console.error('❌ Falha ao salvar estatísticas de jogadores:', err.message);
  }
}

// Rastreamento de longshots
function loadLongshots() {
  try {
    const data = fs.readFileSync(LONGSHOTS_FILE);
    return JSON.parse(data);
  } catch {
    console.log('ℹ️ Nenhum arquivo de longshots encontrado. Começando do zero.');
    return {
      all_time: [],
      daily: {},
      weekly: {},
      monthly: {}
    };
  }
}

function saveLongshots(longshots) {
  try {
    const success = atomicWriteFile(LONGSHOTS_FILE, JSON.stringify(longshots, null, 2));
    if (success) {
      console.log('✅ Longshots salvos.');
    }
  } catch (err) {
    console.error('❌ Falha ao salvar longshots:', err.message);
  }
}

// Rastreamento de sequências de abates
function loadKillstreaks() {
  try {
    const data = fs.readFileSync(KILLSTREAKS_FILE);
    const loadedStreaks = JSON.parse(data);
    console.log('✅ Sequências de abates carregadas do arquivo.');
    return loadedStreaks;
  } catch (err) {
    console.log('ℹ️ Nenhum arquivo de sequências de abates encontrado ou erro ao ler. Começando do zero.');
    return {};
  }
}

function saveKillstreaks(killstreaks) {
  try {
    const success = atomicWriteFile(KILLSTREAKS_FILE, JSON.stringify(killstreaks, null, 2));
    if (success) {
      console.log('✅ Sequências de abates salvas no arquivo.');
    }
  } catch (err) {
    console.error('❌ Falha ao salvar sequências de abates:', err.message);
  }
}

// === AUXILIARES DE PERÍODO DE TEMPO ===
function getTimeIdentifiers() {
  const now = new Date();
  
  // Formato YYYY-MM-DD para diário
  const daily = now.toISOString().split('T')[0];
  
  // Formato YYYY-MM para mensal
  const monthly = daily.substring(0, 7);
  
  // Formato YYYY-Wxx para semana ISO
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now - startOfYear) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  const weekly = `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  
  return { daily, weekly, monthly };
}
// Adiciona isto antes da função updatePlayerStats
function ensurePlayerRecord(periodData, playerName, serverName) {
  if (!periodData[playerName]) {
    periodData[playerName] = { 
      kills: 0, 
      deaths: 0,
      envDeaths: 0, // Nova propriedade para rastrear mortes ambientais
      kd: 0,
      servers: {}
    };
  }
  
  // Adiciona rastreamento de servidor
  if (serverName && !periodData[playerName].servers[serverName]) {
    periodData[playerName].servers[serverName] = {
      kills: 0,
      deaths: 0,
      envDeaths: 0 // Nova propriedade para mortes ambientais específicas do servidor
    };
  }
}
function updateKDRatio(player) {
  const { daily, weekly, monthly } = getTimeIdentifiers();
  
  // Função auxiliar para atualizar K/D em um período específico
  function updateKDForPeriod(periodData) {
    if (periodData && periodData[player]) {
      const stats = periodData[player];
      // Usa apenas mortes causadas por jogadores para K/D (não envDeaths)
      // Quando deaths é 0, K/D é exibido como kills (convenção comum para K/D infinito)
      stats.kd = stats.deaths === 0 ? parseFloat(stats.kills.toFixed(2)) : parseFloat((stats.kills / stats.deaths).toFixed(2));
    }
  }
  
  // Atualiza K/D em todos os períodos
  updateKDForPeriod(playerStats.all_time);
  updateKDForPeriod(playerStats.daily[daily]);
  updateKDForPeriod(playerStats.weekly[weekly]);
  updateKDForPeriod(playerStats.monthly[monthly]);
}
// === RASTREAMENTO DE ESTATÍSTICAS DE JOGADORES ===
function updatePlayerStats(killer, victim, distance, cause, timestamp, serverName) {
  const { daily, weekly, monthly } = getTimeIdentifiers();
  
  // Inicializa estruturas de dados se necessário
  if (!playerStats.all_time) playerStats.all_time = {};
  if (!playerStats.daily) playerStats.daily = {};
  if (!playerStats.weekly) playerStats.weekly = {};
  if (!playerStats.monthly) playerStats.monthly = {};
  
  if (!playerStats.daily[daily]) playerStats.daily[daily] = {};
  if (!playerStats.weekly[weekly]) playerStats.weekly[weekly] = {};
  if (!playerStats.monthly[monthly]) playerStats.monthly[monthly] = {};
  
  // Verifica se é uma morte ambiental (suicídio, queda, etc.)
  const causeLower = cause.toLowerCase();
  const isEnvironmentalDeath = killer === victim || 
                              causeLower.includes('suicide') || 
                              causeLower.includes('falling') || 
                              causeLower.includes('relocation');
  
  // Atualiza estatísticas de abates (se não for morte ambiental)
  if (!isEnvironmentalDeath) {
    // Todos os tempos
    ensurePlayerRecord(playerStats.all_time, killer, serverName);
    playerStats.all_time[killer].kills++;
    if (serverName) {
      playerStats.all_time[killer].servers[serverName].kills++;
    }
    
    // Diário
    ensurePlayerRecord(playerStats.daily[daily], killer, serverName);
    playerStats.daily[daily][killer].kills++;
    if (serverName) {
      playerStats.daily[daily][killer].servers[serverName].kills++;
    }
    
    // Semanal
    ensurePlayerRecord(playerStats.weekly[weekly], killer, serverName);
    playerStats.weekly[weekly][killer].kills++;
    if (serverName) {
      playerStats.weekly[weekly][killer].servers[serverName].kills++;
    }
    
    // Mensal
    ensurePlayerRecord(playerStats.monthly[monthly], killer, serverName);
    playerStats.monthly[monthly][killer].kills++;
    if (serverName) {
      playerStats.monthly[monthly][killer].servers[serverName].kills++;
    }
  }
  
  // Atualiza estatísticas de mortes para a vítima
  ensurePlayerRecord(playerStats.all_time, victim, serverName);
  ensurePlayerRecord(playerStats.daily[daily], victim, serverName);
  ensurePlayerRecord(playerStats.weekly[weekly], victim, serverName);
  ensurePlayerRecord(playerStats.monthly[monthly], victim, serverName);
  
  if (isEnvironmentalDeath) {
    // Registra como morte ambiental (todos os períodos)
    playerStats.all_time[victim].envDeaths++;
    playerStats.daily[daily][victim].envDeaths++;
    playerStats.weekly[weekly][victim].envDeaths++;
    playerStats.monthly[monthly][victim].envDeaths++;
    
    // Específico do servidor
    if (serverName) {
      playerStats.all_time[victim].servers[serverName].envDeaths++;
      playerStats.daily[daily][victim].servers[serverName].envDeaths++;
      playerStats.weekly[weekly][victim].servers[serverName].envDeaths++;
      playerStats.monthly[monthly][victim].servers[serverName].envDeaths++;
    }
  } else {
    // Registra como morte causada por jogador (todos os períodos)
    playerStats.all_time[victim].deaths++;
    playerStats.daily[daily][victim].deaths++;
    playerStats.weekly[weekly][victim].deaths++;
    playerStats.monthly[monthly][victim].deaths++;
    
    // Específico do servidor
    if (serverName) {
      playerStats.all_time[victim].servers[serverName].deaths++;
      playerStats.daily[daily][victim].servers[serverName].deaths++;
      playerStats.weekly[weekly][victim].servers[serverName].deaths++;
      playerStats.monthly[monthly][victim].servers[serverName].deaths++;
    }
  }
  
  // Calcula razões K/D
  updateKDRatio(killer);
  updateKDRatio(victim);
  
  // Rastreia longshot se aplicável (acima de 200m)
  if (parseInt(distance) >= 200 && !isEnvironmentalDeath) {
    trackLongshot(killer, victim, parseInt(distance), cause, timestamp, serverName);
  }
}
// === RASTREAMENTO DE LONGSHOTS ===
function trackLongshot(killer, victim, distance, weapon, timestamp, serverName) {
  const { daily, weekly, monthly } = getTimeIdentifiers();
  
  // Inicializa estrutura de longshots se necessário
  if (!longshots.all_time) longshots.all_time = [];
  if (!longshots.daily) longshots.daily = {};
  if (!longshots.weekly) longshots.weekly = {};
  if (!longshots.monthly) longshots.monthly = {};
  
  if (!longshots.daily[daily]) longshots.daily[daily] = [];
  if (!longshots.weekly[weekly]) longshots.weekly[weekly] = [];
  if (!longshots.monthly[monthly]) longshots.monthly[monthly] = [];
  
  const longshotEntry = {
    killer,
    victim,
    distance,
    weapon,
    timestamp: timestamp || new Date().toISOString(),
    serverName
  };
  
  // Cria uma chave única para prevenir longshots duplicados
  const longshotKey = `${killer}|${victim}|${distance}|${weapon}|${timestamp}`;
  
  // Verifica se este longshot exato já existe em all_time
  const isDuplicate = longshots.all_time.some(shot => 
    shot.killer === killer && 
    shot.victim === victim && 
    shot.distance === distance && 
    shot.weapon === weapon &&
    shot.timestamp === longshotEntry.timestamp
  );
  
  // Adiciona apenas se não for duplicado
  if (!isDuplicate) {
    // Adiciona aos longshots de todos os tempos
    longshots.all_time.push(longshotEntry);
    
    // Adiciona aos longshots diários
    longshots.daily[daily].push(longshotEntry);
    
    // Adiciona aos longshots semanais
    longshots.weekly[weekly].push(longshotEntry);
    
    // Adiciona aos longshots mensais
    longshots.monthly[monthly].push(longshotEntry);
    
    // Ordena todos os arrays de longshots por distância (decrescente)
    longshots.all_time.sort((a, b) => b.distance - a.distance);
    longshots.daily[daily].sort((a, b) => b.distance - a.distance);
    longshots.weekly[weekly].sort((a, b) => b.distance - a.distance);
    longshots.monthly[monthly].sort((a, b) => b.distance - a.distance);
    
    // Mantém apenas os 100 melhores longshots para eficiência de memória
    const MAX_LONGSHOTS = 100;
    if (longshots.all_time.length > MAX_LONGSHOTS) longshots.all_time.length = MAX_LONGSHOTS;
    if (longshots.daily[daily].length > MAX_LONGSHOTS) longshots.daily[daily].length = MAX_LONGSHOTS;
    if (longshots.weekly[weekly].length > MAX_LONGSHOTS) longshots.weekly[weekly].length = MAX_LONGSHOTS;
    if (longshots.monthly[monthly].length > MAX_LONGSHOTS) longshots.monthly[monthly].length = MAX_LONGSHOTS;
  } else {
    console.log(`⚠️ Ignorando longshot duplicado: ${killer} → ${victim} @ ${distance}m`);
  }
}

// === RASTREAMENTO DE SEQUÊNCIAS DE ABATES ===
function updateKillstreak(killer, victim, serverName, config) {
  // Inicializa jogador no objeto killstreaks se não presente
  if (!activeKillstreaks[killer]) {
    activeKillstreaks[killer] = {
      count: 0,
      bestStreak: 0, // Adiciona rastreador de melhor sequência
      lastKill: new Date().toISOString(),
      servers: {}
    };
  }
  
  // Inicializa rastreamento específico do servidor
  if (serverName && !activeKillstreaks[killer].servers[serverName]) {
    activeKillstreaks[killer].servers[serverName] = {
      count: 0,
      bestStreak: 0, // Adiciona rastreador de melhor sequência para servidor
      lastKill: new Date().toISOString()
    };
  }
  
  // Reseta killstreak se jogador foi morto
  if (activeKillstreaks[victim]) {
    // Verifica se vítima tinha uma killstreak significativa antes de morrer (3 ou mais)
    const victimStreak = activeKillstreaks[victim].count;
    
    if (victimStreak >= 3) {
      // Obtém informações de destaque para a vítima
      const victimHighlight = getPlayerHighlight(victim);
      
      const endStreakEmbed = {
        title: "⚡ Sequência de Abates Terminada!",
        color: parseInt("DD3333", 16), // Cor vermelha para sequências terminadas
        description: `**${killer}** terminou a sequência de **${victim}** de **${victimStreak}** abates!`,
        // Usa miniatura personalizada se disponível
        thumbnail: { 
          url: victimHighlight && victimHighlight.thumbnailUrl ? 
            victimHighlight.thumbnailUrl : 
            "https://i.imgur.com/6guD1s3.png" 
        },
        footer: { 
          text: serverName || "Deadside", 
          icon_url: config.iconUrl || "https://i.imgur.com/6guD1s3.png" 
        },
        timestamp: new Date().toISOString()
      };
      
      sendEmbedToDiscord(config.killWebhook, endStreakEmbed);
    }
    
    // Reseta killstreak da vítima
    activeKillstreaks[victim].count = 0;
    
    // Reseta sequência específica do servidor
    if (serverName && activeKillstreaks[victim].servers[serverName]) {
      activeKillstreaks[victim].servers[serverName].count = 0;
    }
  }
  
  // Incrementa sequência do assassino
  activeKillstreaks[killer].count++;
  activeKillstreaks[killer].lastKill = new Date().toISOString();
  
  // Atualiza melhor sequência se sequência atual for maior
  if (activeKillstreaks[killer].count > activeKillstreaks[killer].bestStreak) {
    activeKillstreaks[killer].bestStreak = activeKillstreaks[killer].count;
  }
  
  // Incrementa sequência específica do servidor
  if (serverName) {
    activeKillstreaks[killer].servers[serverName].count++;
    activeKillstreaks[killer].servers[serverName].lastKill = new Date().toISOString();
    
    // Atualiza melhor sequência específica do servidor
    if (activeKillstreaks[killer].servers[serverName].count > 
        activeKillstreaks[killer].servers[serverName].bestStreak) {
      activeKillstreaks[killer].servers[serverName].bestStreak = 
        activeKillstreaks[killer].servers[serverName].count;
    }
  }
  
  // Salva killstreaks imediatamente para garantir persistência entre reinicializações
  saveKillstreaks(activeKillstreaks);
  
  // Verifica marco de killstreak
  return checkKillstreakMilestone(killer, serverName);
}

function checkKillstreakMilestone(player, serverName) {
  const streak = activeKillstreaks[player].count;
  
  // Encontra o maior marco atingido
  for (let i = KILLSTREAK_MILESTONES.length - 1; i >= 0; i--) {
    const milestone = KILLSTREAK_MILESTONES[i];
    
    // Se a sequência corresponde exatamente a um marco, anuncia
    if (streak === milestone.count) {
      return {
        reached: true,
        player,
        count: streak,
        message: milestone.message,
        serverName
      };
    }
  }
  
  return { reached: false };
}

function cleanupKillstreaks() {
  // Killstreaks agora só resetam quando jogadores morrem - sem limpeza automática
  console.log('ℹ️ Limpeza de killstreak chamada - killstreaks só resetam na morte');
  // Apenas salva o estado atual para garantir persistência
  saveKillstreaks(activeKillstreaks);
}

function logActiveKillstreaks() {
  const activeStreaks = Object.entries(activeKillstreaks)
    .filter(([player, data]) => data.count >= 3)
    .sort((a, b) => b[1].count - a[1].count);
  
  if (activeStreaks.length > 0) {
    console.log('⚡ Sequências de abates ativas:');
    activeStreaks.forEach(([player, data]) => {
      console.log(`   ${player}: ${data.count} abates (Melhor: ${data.bestStreak})`);
    });
  } else {
    console.log('ℹ️ Nenhuma sequência de abates significativa ativa.');
  }
}
// === GERAÇÃO DE LEADERBOARD ===
// Aprimorado para usar embeds ricos em vez de texto simples

// Formata a razão K/D de um jogador com codificação de cores baseada no desempenho
function formatKDRatio(kd) {
  let kdStr = kd.toFixed(2);
  
  // Adiciona emoji colorido baseado na razão K/D
  if (kd >= 3.0) return `🟢 ${kdStr}`; // Excelente: círculo verde
  if (kd >= 2.0) return `🟦 ${kdStr}`; // Bom: quadrado azul
  if (kd >= 1.0) return `⬜ ${kdStr}`; // Médio: quadrado branco
  return `🟥 ${kdStr}`; // Abaixo da média: quadrado vermelho
}

// Gera uma barra de progresso formatada baseada no valor
function generateProgressBar(value, maxValue, length = 10) {
  const filledBlocks = Math.round((value / maxValue) * length);
  const emptyBlocks = length - filledBlocks;
  
  // Usando blocos emoji quadrados para uma visualização mais bonita
  return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
}

// Gera um embed rico para leaderboards
// Gera um embed rico para leaderboards
function generateLeaderboardEmbed(data, title, period, limit = 10, serverName = null, config) {
  // Limite de campos de embed do Discord
  const MAX_EMBED_FIELDS = 25;
  
  // Converte objeto para array de estatísticas de jogadores
  const players = Object.entries(data).map(([name, stats]) => ({
    name,
    ...stats
  }));
  
  // Filtra por servidor se especificado
  let filteredPlayers = players;
  if (serverName) {
    filteredPlayers = players.filter(player => 
      player.servers && 
      player.servers[serverName] &&
      (player.servers[serverName].kills > 0 || player.servers[serverName].deaths > 0)
    );
  }
  
  // Ordena por abates (decrescente)
  filteredPlayers.sort((a, b) => b.kills - a.kills);
  
  // Calcula quantos campos de jogadores podemos mostrar
  // Cada jogador precisa de 1 campo, mais 1 campo em branco a cada 2 jogadores
  // Mais precisamos de 2 campos para seção killstreaks (cabeçalho + dados)
  const killstreakFieldsNeeded = 2;
  const maxPlayerFields = Math.floor((MAX_EMBED_FIELDS - killstreakFieldsNeeded) * 2 / 3); // Considera campos em branco
  
  // Limita jogadores para garantir que não excedemos o limite de 25 campos do Discord
  const effectiveLimit = Math.min(limit, maxPlayerFields);
  if (effectiveLimit < limit) {
    console.warn(`⚠️ Reduzindo tamanho do leaderboard de ${limit} para ${effectiveLimit} para ficar dentro do limite de campos do embed do Discord`);
  }
  
  // Pega os N melhores jogadores
  const topPlayers = filteredPlayers.slice(0, effectiveLimit);
  
  // Gera embed
  const embed = {
    title: `${title} - ${serverName || 'Todos os Servidores'}`,
    color: parseInt(config.color.replace('#', ''), 16),
    description: `Melhores jogadores para ${period}`,
    thumbnail: { 
      url: config.iconUrl || "https://i.imgur.com/6guD1s3.png" 
    },
    fields: [],
    footer: { 
      text: `Atualizado: ${formatDate(new Date())}`, 
      icon_url: config.iconUrl || "https://i.imgur.com/6guD1s3.png"
    },
    timestamp: new Date().toISOString()
  };
  
  if (topPlayers.length === 0) {
    embed.description = "Nenhum dado disponível para este período de tempo.";
    return embed;
  }
  
  // Encontra o máximo de abates para escala da barra
  const maxKills = Math.max(...topPlayers.map(p => p.kills));
  
  // Adiciona campos para cada jogador no topo
  topPlayers.forEach((player, index) => {
    const progressBar = generateProgressBar(player.kills, maxKills);
    const playerDeaths = player.deaths || 0;  // Mortes causadas por jogadores
    const envDeaths = player.envDeaths || 0;  // Mortes ambientais
    const kdRatio = formatKDRatio(player.kd);
    
    // Verifica se este é um jogador em destaque
    const playerHighlight = getPlayerHighlight(player.name);
    
    // Formata o nome do jogador no campo nome
    const playerHeader = playerHighlight ? 
      `${index + 1}. ${playerHighlight.prefix}${player.name} ${playerHighlight.emoji}` : 
      `${index + 1}. ${player.name}`;
    
    embed.fields.push({
      name: playerHeader,
      value: `Abates: **${player.kills}** ${progressBar}\nMortes por Jogadores: **${playerDeaths}** | Mortes Ambientais: **${envDeaths}**\nK/D: **${kdRatio}**`,
      inline: true
    });
    
    // Adiciona um campo em branco a cada 2 jogadores para melhor formatação
    if (index % 2 === 1 && index < topPlayers.length - 1) {
      embed.fields.push({ name: '\u200B', value: '\u200B', inline: true });
    }
  });
  
  // Adiciona seção dos 5 melhores killstreaks
  embed.fields.push({ name: '\u200B', value: '**Top 5 Sequências de Abates Ativas**', inline: false });
  
  // Obtém killstreaks ativas
  const activeStreaks = Object.entries(activeKillstreaks)
    .map(([player, data]) => ({ 
      player, 
      streak: data.count,
      bestStreak: data.bestStreak || 0
    }))
    .filter(streak => streak.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5);

  if (activeStreaks.length > 0) {
    const streaksText = activeStreaks
      .map((streak, index) => {
        // Verifica se este jogador está em destaque
        const playerHighlight = getPlayerHighlight(streak.player);
        
        // Formata o nome do jogador com destaque se aplicável
        const playerDisplay = playerHighlight ?
          `${playerHighlight.prefix}**${streak.player}** ${playerHighlight.emoji}` :
          `**${streak.player}**`;
          
        return `${index + 1}. ${playerDisplay}: ${streak.streak} abates (Melhor: ${streak.bestStreak})`;
      })
      .join('\n');

    embed.fields.push({
      name: '\u200B',
      value: streaksText,
      inline: false
    });
  }
  
  return embed;
}

// Gera embed rico para leaderboard de longshots
function generateLongshotsEmbed(longshotsArray, title, period, limit = 5, serverName = null, config) {
  // Filtra por servidor se especificado
  let filteredLongshots = longshotsArray;
  if (serverName) {
    filteredLongshots = longshotsArray.filter(shot => !serverName || shot.serverName === serverName);
  }
  
  // Pega os N melhores longshots
  const topShots = filteredLongshots.slice(0, limit);
  
  // Gera embed
  const embed = {
    title: `${title} - ${serverName || 'Todos os Servidores'}`,
    color: parseInt("AA33AA", 16), // Cor roxa para longshots
    description: `Melhores longshots para ${period}`,
    thumbnail: { 
      url: config.iconUrl || "https://i.imgur.com/6guD1s3.png" 
    },
    fields: [],
    footer: { 
      text: `Atualizado: ${formatDate(new Date())}`, 
      icon_url: config.iconUrl || "https://i.imgur.com/6guD1s3.png"
    },
    timestamp: new Date().toISOString()
  };
  
  if (topShots.length === 0) {
    embed.description = "Nenhum longshot registrado ainda para este período de tempo.";
    return embed;
  }
  
  // Adiciona campos para cada longshot
  topShots.forEach((shot, index) => {
    // Encontra a distância máxima para todos os tiros para escala
    const maxDistance = topShots[0].distance;
    const progressBar = generateProgressBar(shot.distance, maxDistance);
    
    embed.fields.push({
      name: `${index + 1}. ${shot.killer} → ${shot.victim}`,
      value: `**${shot.distance}m** ${progressBar}\nArma: **${shot.weapon}**\nData: ${formatDate(new Date(shot.timestamp))}`,
      inline: false
    });
  });
  
  return embed;
}

// Envia leaderboards para o Discord
async function sendLeaderboards() {
  const { daily, weekly, monthly } = getTimeIdentifiers();
  
  console.log('🏆 Gerando e enviando leaderboards...');
  
  for (const config of serverConfigs) {
    try {
      // Leaderboard diário
      if (playerStats.daily[daily]) {
        const dailyLeaderboardEmbed = generateLeaderboardEmbed(
          playerStats.daily[daily],
          "Leaderboard Diário",
          "Hoje",
          10,
          config.serverName,
          config
        );
        await sendEmbedToDiscord(config.dailyLeaderboardWebhook, dailyLeaderboardEmbed);
        console.log(`✅ Leaderboard diário enviado para ${config.serverName}`);
        
        // Longshots diários
        if (longshots.daily[daily]) {
          const dailyLongshotsEmbed = generateLongshotsEmbed(
            longshots.daily[daily],
            "Top Longshots Diários",
            "Hoje",
            5,
            config.serverName,
            config
          );
          await sendEmbedToDiscord(config.longshotWebhook, dailyLongshotsEmbed);
          console.log(`✅ Longshots diários enviados para ${config.serverName}`);
        }
      }
      
      // Leaderboard semanal
      if (playerStats.weekly[weekly]) {
        const weeklyLeaderboardEmbed = generateLeaderboardEmbed(
          playerStats.weekly[weekly],
          "Leaderboard Semanal",
          "Esta Semana",
          10,
          config.serverName,
          config
        );
        await sendEmbedToDiscord(config.weeklyLeaderboardWebhook, weeklyLeaderboardEmbed);
        console.log(`✅ Leaderboard semanal enviado para ${config.serverName}`);
        
        // Longshots semanais
        if (longshots.weekly[weekly]) {
          const weeklyLongshotsEmbed = generateLongshotsEmbed(
            longshots.weekly[weekly],
            "Top Longshots Semanais",
            "Esta Semana",
            5,
            config.serverName,
            config
          );
          await sendEmbedToDiscord(config.longshotWebhook, weeklyLongshotsEmbed);
          console.log(`✅ Longshots semanais enviados para ${config.serverName}`);
        }
      }
      
      // Leaderboard mensal
      if (playerStats.monthly[monthly]) {
        const monthlyLeaderboardEmbed = generateLeaderboardEmbed(
          playerStats.monthly[monthly],
          "Leaderboard Mensal",
          "Este Mês",
          10,
          config.serverName,
          config
        );
        await sendEmbedToDiscord(config.monthlyLeaderboardWebhook, monthlyLeaderboardEmbed);
        console.log(`✅ Leaderboard mensal enviado para ${config.serverName}`);
        
        // Longshots mensais
        if (longshots.monthly[monthly]) {
          const monthlyLongshotsEmbed = generateLongshotsEmbed(
            longshots.monthly[monthly],
            "Top Longshots Mensais",
            "Este Mês",
            5,
            config.serverName,
            config
          );
          await sendEmbedToDiscord(config.longshotWebhook, monthlyLongshotsEmbed);
          console.log(`✅ Longshots mensais enviados para ${config.serverName}`);
        }
      }
      
      // Leaderboard de todos os tempos
      if (playerStats.all_time) {
        const allTimeLeaderboardEmbed = generateLeaderboardEmbed(
          playerStats.all_time,
          "Leaderboard de Todos os Tempos",
          "Todos os Tempos",
          10,
          config.serverName,
          config
        );
        await sendEmbedToDiscord(config.allTimeLeaderboardWebhook, allTimeLeaderboardEmbed);
        console.log(`✅ Leaderboard de todos os tempos enviado para ${config.serverName}`);
        
        // Longshots de todos os tempos
        if (longshots.all_time) {
          const allTimeLongshotsEmbed = generateLongshotsEmbed(
            longshots.all_time,
            "Top Longshots de Todos os Tempos",
            "Todos os Tempos",
            5,
            config.serverName,
            config
          );
          await sendEmbedToDiscord(config.longshotWebhook, allTimeLongshotsEmbed);
          console.log(`✅ Longshots de todos os tempos enviados para ${config.serverName}`);
        }
      }
      
      // Pequeno atraso entre servidores para evitar limite de taxa
      await new Promise(res => setTimeout(res, 1000));
      
    } catch (err) {
      console.error(`❌ Erro ao enviar leaderboards para ${config.serverName}:`, err.message);
    }
  }
}

// Gera um embed de estatísticas abrangente para todos os jogadores
async function sendAllPlayerStatsEmbed(config) {
  console.log(`🔍 Gerando estatísticas de todos os jogadores para ${config.serverName}...`);
  
  // Obtém todos os jogadores das estatísticas de todos os tempos que têm estatísticas para este servidor específico
  const allPlayers = Object.keys(playerStats.all_time);
  const players = allPlayers.filter(player => {
    const playerStat = playerStats.all_time[player]; // Nome de variável alterado para evitar conflito
    return playerStat.servers && 
           playerStat.servers[config.serverName] && 
           (playerStat.servers[config.serverName].kills > 0 || 
            playerStat.servers[config.serverName].deaths > 0);
  });
  
  // Ordena jogadores por abates (decrescente) para este servidor específico
  players.sort((a, b) => {
    const aKills = playerStats.all_time[a].servers[config.serverName].kills || 0;
    const bKills = playerStats.all_time[b].servers[config.serverName].kills || 0;
    return bKills - aKills;
  });
  
  // Cria base do embed
  const embed = {
    title: `📊 Estatísticas de Jogadores - ${config.serverName}`,
    color: parseInt(config.color.replace('#', ''), 16),
    description: `Estatísticas de todos os ${players.length} jogadores em ${config.serverName}`,
    thumbnail: { 
      url: config.iconUrl || "https://i.imgur.com/6guD1s3.png" 
    },
    fields: [],
    footer: { 
      text: `Atualizado: ${formatDate(new Date())}`, 
      icon_url: config.iconUrl || "https://i.imgur.com/6guD1s3.png"
    },
    timestamp: new Date().toISOString()
  };
  
  // Encontra o maior abate para cada jogador (apenas para este servidor)
  const playerLongestKills = {};
  longshots.all_time.forEach(shot => {
    if (shot.serverName === config.serverName) {
      if (!playerLongestKills[shot.killer] || shot.distance > playerLongestKills[shot.killer]) {
        playerLongestKills[shot.killer] = shot.distance;
      }
    }
  });
  
  // Encontra a maior sequência de abates para cada jogador (apenas para este servidor)
  const playerHighestStreaks = {};
  for (const player in activeKillstreaks) {
    if (activeKillstreaks[player].servers && 
        activeKillstreaks[player].servers[config.serverName]) {
      playerHighestStreaks[player] = activeKillstreaks[player].servers[config.serverName].count || 0;
    }
  }
  
  // Processa em lotes (Discord tem limite de 25 campos por embed)
  const PLAYERS_PER_EMBED = 20;
  const embeds = [];
  
  for (let i = 0; i < players.length; i += PLAYERS_PER_EMBED) {
    const batchPlayers = players.slice(i, i + PLAYERS_PER_EMBED);
    
    // Clona o embed base para este lote
    const batchEmbed = JSON.parse(JSON.stringify(embed));
    
    if (i > 0) {
      batchEmbed.title = `📊 Estatísticas de Jogadores - ${config.serverName} (Página ${Math.floor(i/PLAYERS_PER_EMBED) + 1})`;
    }
    
    // Adiciona campos de jogadores a este lote
    // Na seção de campos de jogadores de sendAllPlayerStatsEmbed
// Atualiza esta parte na exibição de estatísticas de jogadores
batchPlayers.forEach(player => {
  const allStats = playerStats.all_time[player];
  // Obtém estatísticas específicas do servidor
  const serverStats = allStats.servers[config.serverName];
  
  const kills = serverStats.kills || 0;
  const playerDeaths = serverStats.deaths || 0; // Apenas mortes causadas por jogadores
  const envDeaths = serverStats.envDeaths || 0; // Mortes ambientais
  const kd = playerDeaths === 0 ? kills : parseFloat((kills / playerDeaths).toFixed(2)); // K/D usa apenas mortes de jogadores
  
  const longestKill = playerLongestKills[player] ? `${playerLongestKills[player]}m` : 'N/A';
  
  // Obtém melhor sequência em vez da sequência atual
  const highestStreak = (activeKillstreaks[player] && 
                         activeKillstreaks[player].servers && 
                         activeKillstreaks[player].servers[config.serverName]) 
    ? activeKillstreaks[player].servers[config.serverName].bestStreak 
    : 0;
  
  batchEmbed.fields.push({
    name: player,
    value: `Abates: **${kills}** | Mortes por Jogadores: **${playerDeaths}** | Mortes Ambientais: **${envDeaths}**\nK/D: **${kd.toFixed(2)}** | Maior Abate: **${longestKill}** | Melhor Sequência: **${highestStreak}**`,
    inline: false
  });
});
    
    embeds.push(batchEmbed);
  }
  
  // Envia todos os embeds
  for (const embedToSend of embeds) {
    await sendEmbedToDiscord(config.allPlayersStatsWebhook, embedToSend);
    // Pequeno atraso para evitar limite de taxa
    await new Promise(res => setTimeout(res, 1000));
  }
  
  console.log(`✅ Estatísticas de todos os jogadores enviadas para ${config.serverName}`);
}

// === TRATAMENTO DE LIMITE DE TAXA DO DISCORD ===
// Processa mensagens do Discord na fila respeitando os limites de taxa
async function processDiscordQueue() {
  if (RATE_LIMITS.queue.length === 0) {
    RATE_LIMITS.processing = false;
    return;
  }
  
  RATE_LIMITS.processing = true;
  
  // Ordena a fila por tempo (mais antigo primeiro)
  RATE_LIMITS.queue.sort((a, b) => a.time - b.time);
  
  const now = Date.now();
  const nextMessage = RATE_LIMITS.queue[0];
  
  // Verifica se este webhook está atualmente limitado por taxa
  if (RATE_LIMITS.webhooks[nextMessage.webhookUrl] && RATE_LIMITS.webhooks[nextMessage.webhookUrl] > now) {
    // Calcula tempo de espera
    const waitTime = RATE_LIMITS.webhooks[nextMessage.webhookUrl] - now;
    console.log(`⏳ Aguardando ${waitTime}ms para limite de taxa expirar para webhook`);
    
    // Espera o limite de taxa expirar e tenta novamente
    setTimeout(processDiscordQueue, waitTime + 100); // Adiciona buffer de 100ms
    return;
  }
  
  // Remove da fila
  RATE_LIMITS.queue.shift();
  
  try {
    // Tenta enviar a mensagem
    if (nextMessage.isEmbed) {
      // Verifica imagem no embed ao processar fila
      if (nextMessage.embed.image && nextMessage.embed.image.url) {
        console.log(`Fila: Processando embed com URL de imagem: ${nextMessage.embed.image.url}`);
      } else {
        console.log(`Fila: Embed NÃO contém URL de imagem`);
      }
      
      const response = await axios.post(nextMessage.webhookUrl, { embeds: [nextMessage.embed] });
      console.log(`✅ Embed na fila enviado para o Discord. Status: ${response.status}`);
    } else {
      await axios.post(nextMessage.webhookUrl, { content: nextMessage.message });
      console.log(`✅ Mensagem de texto na fila enviada para o Discord`);
    }
  } catch (err) {
    console.error(`❌ Erro na fila:`, err.message);
    if (err.response && err.response.status === 429) {
      const retryAfter = err.response.data.retry_after || 1;
      console.log(`⚠️ Limitado por taxa novamente para webhook, tentar novamente após ${retryAfter}s`);
      
      // Atualiza tempo de limite de taxa
      RATE_LIMITS.webhooks[nextMessage.webhookUrl] = now + (retryAfter * 1000) + 100;
      
      // Coloca a mensagem de volta no início da fila
      RATE_LIMITS.queue.unshift(nextMessage);
    } else {
      // Para outros erros, registra mas não tenta novamente para evitar loops infinitos
      console.error(`❌ Falha ao enviar mensagem na fila:`, err.message);
    }
  }
  
  // Pequeno atraso para evitar atingir limites de taxa muito rapidamente
  await new Promise(res => setTimeout(res, 500));
  
  // Continua processando a fila
  processDiscordQueue();
}

// === FUNÇÃO DE MENSAGEM DO DISCORD COM TRATAMENTO DE LIMITE DE TAXA ===
async function sendToDiscordWithRetry(webhookUrl, message) {
  // Verifica se este webhook está atualmente limitado por taxa
  const now = Date.now();
  if (RATE_LIMITS.webhooks[webhookUrl] && RATE_LIMITS.webhooks[webhookUrl] > now) {
    // Adiciona à fila em vez de enviar imediatamente
    RATE_LIMITS.queue.push({ webhookUrl, message, time: now, isEmbed: false });
    // Inicia processador de fila se ainda não estiver rodando
    if (!RATE_LIMITS.processing) {
      processDiscordQueue();
    }
    return;
  }

  try {
    // Tenta enviar a mensagem
    await retryAsync(() => axios.post(webhookUrl, { content: message }));
  } catch (err) {
    // Trata limitação de taxa
    if (err.response && err.response.status === 429) {
      const retryAfter = err.response.data.retry_after || 1;
      console.log(`⚠️ Limitado por taxa para webhook, tentar novamente após ${retryAfter}s`);
      
      // Marca este webhook como limitado por taxa
      RATE_LIMITS.webhooks[webhookUrl] = now + (retryAfter * 1000) + 100; // Adiciona buffer de 100ms
      
      // Adiciona mensagem à fila
      RATE_LIMITS.queue.push({ webhookUrl, message, time: now, isEmbed: false });
      
      // Inicia processador de fila se ainda não estiver rodando
      if (!RATE_LIMITS.processing) {
        processDiscordQueue();
      }
    } else {
      // Para outros erros, apenas registra
      console.error(`❌ Erro ao enviar para o Discord:`, err.message);
    }
  }
}

// Função para enviar embed rico para o Discord com limitação de taxa e depuração
async function sendEmbedToDiscord(webhookUrl, embed) {
  // Adiciona logs de depuração
  console.log(`Tentando enviar embed para webhook: ${webhookUrl}`);
  
  // Verifica URL da miniatura
  if (embed.thumbnail && embed.thumbnail.url) {
    console.log(`✅ URL da miniatura do embed: ${embed.thumbnail.url}`);
  } else {
    console.error(`❌ Embed está FALTANDO URL da miniatura`);
  }
  
  // Verifica URL da imagem
  if (embed.image && embed.image.url) {
    console.log(`✅ URL da imagem do embed: ${embed.image.url}`);
  } else {
    console.log(`ℹ️ Embed não tem URL de imagem (isso pode ser intencional)`);
  }
  
  // Verifica se este webhook está atualmente limitado por taxa
  const now = Date.now();
  if (RATE_LIMITS.webhooks[webhookUrl] && RATE_LIMITS.webhooks[webhookUrl] > now) {
    console.log(`Limitado por taxa, adicionando à fila...`);
    // Adiciona à fila em vez de enviar imediatamente
    RATE_LIMITS.queue.push({ webhookUrl, embed, time: now, isEmbed: true });
    // Inicia processador de fila se ainda não estiver rodando
    if (!RATE_LIMITS.processing) {
      processDiscordQueue();
    }
    return;
  }

  try {
    // Garante que cor seja um inteiro
    if (embed.color && typeof embed.color === 'string') {
      embed.color = parseInt(embed.color.replace('#', ''), 16);
    }
    
    // Formata o embed corretamente para API do Discord
    const payload = { embeds: [embed] };
    console.log(`Enviando payload do embed: ${JSON.stringify(payload).substring(0, 200)}...`);
    
    // Tenta enviar o embed
    const response = await axios.post(webhookUrl, payload);
    console.log(`✅ Embed enviado com sucesso para o Discord. Status: ${response.status}`);
  } catch (err) {
    console.error(`❌ Erro completo ao enviar para o Discord:`, err);
    
    // Trata limitação de taxa
    if (err.response && err.response.status === 429) {
      const retryAfter = err.response.data.retry_after || 1;
      console.log(`⚠️ Limitado por taxa para webhook, tentar novamente após ${retryAfter}s`);
      
      // Marca este webhook como limitado por taxa
      RATE_LIMITS.webhooks[webhookUrl] = now + (retryAfter * 1000) + 100; // Adiciona buffer de 100ms
      
      // Adiciona embed à fila
      RATE_LIMITS.queue.push({ webhookUrl, embed, time: now, isEmbed: true });
      
      // Inicia processador de fila se ainda não estiver rodando
      if (!RATE_LIMITS.processing) {
        processDiscordQueue();
      }
    } else {
      // Para outros erros, apenas registra
      console.error(`❌ Erro ao enviar embed para o Discord:`, err.message);
      
      // Adiciona informações de erro mais detalhadas se disponíveis
      if (err.response) {
        console.error(`Código de status: ${err.response.status}`);
        console.error(`Dados da resposta: ${JSON.stringify(err.response.data || {}).substring(0, 200)}`);
      }
    }
  }
}
// Função para verificar corretamente as URLs de imagem dos jogadores em destaque
function validateHighlightedPlayerUrls() {
  console.log('🔍 Validando URLs de imagem dos jogadores em destaque:');
  let hasIssues = false;
  
  for (const player in HIGHLIGHTED_PLAYERS) {
    const highlight = HIGHLIGHTED_PLAYERS[player];
    
    // Verifica URL do GIF
    if (!highlight.gifUrl) {
      console.error(`❌ URL DE GIF FALTANDO para ${player}`);
      hasIssues = true;
    } else {
      console.log(`✅ ${player} URL do GIF: ${highlight.gifUrl}`);
    }
    
    // Verifica URL da miniatura
    if (!highlight.thumbnailUrl) {
      console.error(`⚠️ URL DA MINIATURA FALTANDO para ${player}`);
      hasIssues = true;
    } else {
      console.log(`✅ ${player} URL da miniatura: ${highlight.thumbnailUrl}`);
    }
  }
  
  return !hasIssues;
}

function createKillEmbed(killer, victim, weapon, distance, serverName, config) {
  console.log(`Criando embed de abate para ${killer} matando ${victim}`);
  const emoji = weaponEmojis[weapon] || '🔫';
  const distanceText = distance > 0 ? `${distance}m` : 'N/A';
  
  // Cria uma cópia do template do embed de abate
  const embed = JSON.parse(JSON.stringify(EMBED_TEMPLATES.kill));
  
  // Obtém formatação destacada para jogadores
  const killerHighlight = getPlayerHighlight(killer);
  const victimHighlight = getPlayerHighlight(victim);
  
  console.log(`Destaque do assassino para ${killer}:`, killerHighlight);
  console.log(`Destaque da vítima para ${victim}:`, victimHighlight);
  
  // Formata nomes de jogadores com destaques se aplicável
  const killerDisplay = formatPlayerName(killer);
  const victimDisplay = formatPlayerName(victim);
  
  // Substitui variáveis do template com nomes regulares (para título)
  embed.title = embed.title
    .replace('{emoji}', emoji)
    .replace('{killer}', killer)
    .replace('{victim}', victim);
  
  // Obtém a frase de abate e aplica formatação destacada
  let phrase = getNextKillPhrase();
  phrase = phrase
    .replace('{killer}', killerDisplay)
    .replace('{victim}', victimDisplay)
    .replace('{weapon}', weapon)
    .replace('{distance}', distance > 0 ? ` (${distance}m)` : '');
  
  embed.description = phrase;
  
  // Atualiza campos
  embed.fields[0].value = weapon;
  embed.fields[1].value = distanceText;
  
  // Define informações específicas do servidor
  embed.footer.text = serverName;
  embed.footer.icon_url = config.iconUrl || 'https://i.imgur.com/6guD1s3.png';
  
  // CORRIGIDO: Tratamento de URL da imagem - define imagem corretamente para jogadores em destaque
  if (killerHighlight && killerHighlight.gifUrl) {
    console.log(`Adicionando GIF para assassino ${killer}: ${killerHighlight.gifUrl}`);
    embed.image = { url: killerHighlight.gifUrl };
  } else if (victimHighlight && victimHighlight.gifUrl) {
    console.log(`Adicionando GIF para vítima ${victim}: ${victimHighlight.gifUrl}`);
    embed.image = { url: victimHighlight.gifUrl };
  } else {
    // Garante que imagem seja definida como null se nenhum GIF estiver disponível
    embed.image = { url: null };
  }
  
  // Define cor - prioriza cor do jogador em destaque se presente
  if (killerHighlight) {
    embed.color = parseInt(killerHighlight.color.replace('#', ''), 16);
  } else if (victimHighlight) {
    embed.color = parseInt(victimHighlight.color.replace('#', ''), 16);
  } else {
    embed.color = parseInt(config.color.replace('#', ''), 16);
  }
  
  // CORRIGIDO: Tratamento de URL da miniatura
  if (killerHighlight && killerHighlight.thumbnailUrl) {
    console.log(`Definindo miniatura para assassino ${killer}: ${killerHighlight.thumbnailUrl}`);
    embed.thumbnail.url = killerHighlight.thumbnailUrl;
  } else if (victimHighlight && victimHighlight.thumbnailUrl) {
    console.log(`Definindo miniatura para vítima ${victim}: ${victimHighlight.thumbnailUrl}`);
    embed.thumbnail.url = victimHighlight.thumbnailUrl;
  } else {
    embed.thumbnail.url = getWeaponIconURL(weapon);
  }
  
  console.log(`URL da imagem do embed final: ${embed.image.url}`);
  console.log(`URL da miniatura do embed final: ${embed.thumbnail.url}`);
  
  return embed;
}

// Função para criar e enviar um embed de abate de jogador em destaque
async function sendHighlightedKillEmbed(killer, victim, weapon, distance, config) {
  // Continua apenas se assassino ou vítima for um jogador em destaque
  const killerHighlight = getPlayerHighlight(killer);
  const victimHighlight = getPlayerHighlight(victim);
  
  if (!killerHighlight && !victimHighlight) {
    return; // Nenhum jogador está em destaque, pula esta função
  }
  
  // Determina qual estilo de jogador usar (prioriza assassino)
  const playerHighlight = killerHighlight || victimHighlight;
  const highlightedPlayer = killerHighlight ? killer : victim;
  const isKillerHighlighted = !!killerHighlight;
  
  console.log(`Criando embed destacado para ${highlightedPlayer}`);
  console.log(`Dados de destaque do jogador:`, playerHighlight);
  
  // Cria um embed especializado para jogadores em destaque
  const embed = {
    title: `${playerHighlight.emoji} JOGADOR EM DESTAQUE ${playerHighlight.emoji}`,
    description: isKillerHighlighted ? 
      `${playerHighlight.prefix}**${killer}** acabou de eliminar **${victim}** com **${weapon}**${distance > 0 ? ` a ${distance}m de distância` : ''}!` :
      `${playerHighlight.prefix}**${victim}** foi eliminado por **${killer}** com **${weapon}**${distance > 0 ? ` a ${distance}m de distância` : ''}!`,
    color: parseInt(playerHighlight.color.replace('#', ''), 16),
    // CORRIGIDO: Define corretamente a URL da imagem
    image: { 
      url: playerHighlight.gifUrl 
    },
    // CORRIGIDO: Define corretamente a URL da miniatura
    thumbnail: {
      url: playerHighlight.thumbnailUrl || getWeaponIconURL(weapon)
    },
    fields: [
      { name: "Arma", value: weapon, inline: true },
      { name: "Distância", value: distance > 0 ? `${distance}m` : 'N/A', inline: true }
    ],
    footer: { 
      text: `${config.serverName} | ${formatDate(new Date())}`, 
      icon_url: config.iconUrl 
    },
    timestamp: new Date().toISOString()
  };
  
  console.log(`URL da imagem do embed destacado: ${embed.image.url}`);
  console.log(`URL da miniatura do embed destacado: ${embed.thumbnail.url}`);
  
  // Envia o embed especializado
  await sendEmbedToDiscord(config.killWebhook, embed);
  console.log(`✅ Embed de jogador em destaque enviado para ${highlightedPlayer}`);
}
// Função para criar e enviar um embed de sequência de abates de jogador em destaque
async function sendHighlightedKillstreakEmbed(player, killstreakCount, milestone, config) {
  // Continua apenas se jogador estiver em destaque
  const playerHighlight = getPlayerHighlight(player);
  
  if (!playerHighlight) {
    return; // Não é um jogador em destaque, pula esta função
  }
  
  // Cria um embed de sequência de abates especializado para jogadores em destaque
  const embed = {
    title: `${playerHighlight.emoji} ALERTA DE SEQUÊNCIA DE ABATES ${playerHighlight.emoji}`,
    description: `${playerHighlight.prefix}**${player}** ${milestone} com **${killstreakCount}** abates consecutivos!`,
    color: parseInt(playerHighlight.color.replace('#', ''), 16),
    // Atualiza miniatura para usar uma miniatura personalizada se disponível
    thumbnail: { 
      url: playerHighlight.thumbnailUrl || playerHighlight.gifUrl 
    },
    fields: [
      { name: "Sequência Atual", value: `${killstreakCount} abates`, inline: true },
      { name: "Conquista", value: milestone, inline: true }
    ],
    footer: { 
      text: `${config.serverName} | ${formatDate(new Date())}`, 
      icon_url: config.iconUrl 
    },
    timestamp: new Date().toISOString()
  };
  
  // Envia o embed especializado
  await sendEmbedToDiscord(config.killWebhook, embed);
  console.log(`✅ Embed de sequência de abates destacado enviado para ${player}`);
}
function createLongshotEmbed(killer, victim, weapon, distance, serverName, config) {
  // Cria uma cópia do template do embed de longshot
  const embed = JSON.parse(JSON.stringify(EMBED_TEMPLATES.longshot));
  
  // Formata nomes de jogadores com destaques
  const killerDisplay = formatPlayerName(killer);
  const victimDisplay = formatPlayerName(victim);
  
  // Obtém informações de destaque para coloração
  const killerHighlight = getPlayerHighlight(killer);
  const victimHighlight = getPlayerHighlight(victim);
  
  // Define descrição do template de frase de longshot com destaques
  const phrase = getNextLongshotPhrase();
  embed.description = phrase
    .replace('{killer}', killerDisplay)
    .replace('{victim}', victimDisplay)
    .replace('{weapon}', weapon)
    .replace('{distance}', distance);
  
  // Atualiza campos
  embed.fields[0].value = `**${distance}m**`;
  embed.fields[1].value = weapon;
  
  // Adiciona GIF para jogadores em destaque
  if (killerHighlight && killerHighlight.gifUrl) {
    embed.image = { url: killerHighlight.gifUrl };
  } else if (victimHighlight && victimHighlight.gifUrl) {
    embed.image = { url: victimHighlight.gifUrl };
  }
  
  // Define informações específicas do servidor
  embed.footer.text = serverName;
  embed.footer.icon_url = config.iconUrl || 'https://i.imgur.com/6guD1s3.png';
  
  // Define cor - prioriza cor do jogador em destaque se presente
  if (killerHighlight) {
    embed.color = parseInt(killerHighlight.color.replace('#', ''), 16);
  } else {
    embed.color = parseInt("AA33AA", 16); // Cor roxa padrão para longshots
  }
  
  // Define miniatura personalizada para jogadores em destaque ou ícone de arma
  if (killerHighlight && killerHighlight.thumbnailUrl) {
    embed.thumbnail.url = killerHighlight.thumbnailUrl;
  } else if (victimHighlight && victimHighlight.thumbnailUrl) {
    embed.thumbnail.url = victimHighlight.thumbnailUrl;
  } else {
    embed.thumbnail.url = getWeaponIconURL(weapon);
  }
  
  return embed;
}

function createSuicideEmbed(victim, cause, serverName, config) {
  const emoji = "💀";
  
  // Cria uma cópia do template do embed de suicídio
  const embed = JSON.parse(JSON.stringify(EMBED_TEMPLATES.suicide));
  
  // Formata nome da vítima com destaque se aplicável
  const victimDisplay = formatPlayerName(victim);
  
  // Obtém informações de destaque para coloração
  const victimHighlight = getPlayerHighlight(victim);
  
  // Substitui variáveis do template para título (usando nome regular)
  embed.title = embed.title
    .replace('{emoji}', emoji)
    .replace('{victim}', victim);
  
  // Define descrição do template de frase de suicídio com destaque
  const phrase = getNextSuicidePhrase();
  embed.description = `${phrase.replace('{victim}', victimDisplay)} (${cause.replace(/_/g, ' ')})`;
  
  // Adiciona GIF para jogadores em destaque
  if (victimHighlight && victimHighlight.gifUrl) {
    embed.image = { url: victimHighlight.gifUrl };
  }
  
  // Define informações específicas do servidor
  embed.footer.text = serverName;
  embed.footer.icon_url = config.iconUrl || 'https://i.imgur.com/6guD1s3.png';
  
  // Define cor - usa cor do jogador em destaque se presente
  if (victimHighlight) {
    embed.color = parseInt(victimHighlight.color.replace('#', ''), 16);
  } else {
    embed.color = parseInt("DD3333", 16); // Cor vermelha padrão para suicídios
  }
  
  // Define miniatura personalizada se disponível
  if (victimHighlight && victimHighlight.thumbnailUrl) {
    embed.thumbnail.url = victimHighlight.thumbnailUrl;
  }
  
  return embed;
}

function createKillstreakEmbed(killstreakResult, serverName, config) {
  // Cria uma cópia do template do embed de sequência de abates
  const embed = JSON.parse(JSON.stringify(EMBED_TEMPLATES.killstreak));
  
  // Formata nome do jogador com destaque se aplicável
  const playerDisplay = formatPlayerName(killstreakResult.player);
  
  // Obtém informações de destaque para coloração
  const playerHighlight = getPlayerHighlight(killstreakResult.player);
  
  // Substitui variáveis do template com versão destacada
  embed.description = embed.description
    .replace('{player}', playerDisplay)
    .replace('{milestone}', killstreakResult.message)
    .replace('{count}', killstreakResult.count);
  
  // Add GIF for highlighted players
  if (playerHighlight && playerHighlight.gifUrl) {
    embed.image = { url: playerHighlight.gifUrl };
  }
  
  // Set server-specific info
  embed.footer.text = serverName;
  embed.footer.icon_url = config.iconUrl || 'https://i.imgur.com/6guD1s3.png';
  
  // Set color - use highlighted player's color if present
  if (playerHighlight) {
    embed.color = parseInt(playerHighlight.color.replace('#', ''), 16);
  } else {
    embed.color = parseInt("FFAA00", 16); // Default orange color for killstreaks
  }
  
  // Set custom thumbnail if available
  if (playerHighlight && playerHighlight.thumbnailUrl) {
    embed.thumbnail.url = playerHighlight.thumbnailUrl;
  }
  
  return embed;
}

// === LIMPEZA DE DADOS ANTIGOS ===
function cleanupOldData() {
  const { daily, weekly, monthly } = getTimeIdentifiers();
  const now = new Date();
  
  // Limpa dados diários com mais de 30 dias
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
  
  // Limpa dados mensais com mais de 12 meses
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(now.getMonth() - 12);
  const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().substring(0, 7);
  
  console.log(`🧹 Limpando dados antigos anteriores a ${thirtyDaysAgoStr} (diário) e ${twelveMonthsAgoStr} (mensal)`);
  
  // Limpa dados diários
  Object.keys(playerStats.daily).forEach(date => {
    if (date < thirtyDaysAgoStr) {
      delete playerStats.daily[date];
    }
  });
  
  Object.keys(longshots.daily).forEach(date => {
    if (date < thirtyDaysAgoStr) {
      delete longshots.daily[date];
    }
  });
  
  // Limpa dados mensais
  Object.keys(playerStats.monthly).forEach(month => {
    if (month < twelveMonthsAgoStr) {
      delete playerStats.monthly[month];
    }
  });
  
  Object.keys(longshots.monthly).forEach(month => {
    if (month < twelveMonthsAgoStr) {
      delete longshots.monthly[month];
    }
  });
  
  // Limpa dados semanais - apenas mantém últimas 12 semanas por simplicidade
  const weekKeys = Object.keys(playerStats.weekly).sort((a, b) => b.localeCompare(a));
  if (weekKeys.length > 12) {
    const keysToKeep = weekKeys.slice(0, 12);
    playerStats.weekly = Object.fromEntries(
      Object.entries(playerStats.weekly).filter(([key]) => keysToKeep.includes(key))
    );
  }
  
  const longshotWeekKeys = Object.keys(longshots.weekly).sort((a, b) => b.localeCompare(a));
  if (longshotWeekKeys.length > 12) {
    const keysToKeep = longshotWeekKeys.slice(0, 12);
    longshots.weekly = Object.fromEntries(
      Object.entries(longshots.weekly).filter(([key]) => keysToKeep.includes(key))
    );
  }
  
  console.log('✅ Limpeza concluída');
  
  // Salva alterações
  savePlayerStats(playerStats);
  saveLongshots(longshots);
}

// === MIGRAÇÃO DE DADOS ===
function migrateOldLeaderboardData() {
  // Esta função migra dados do formato antigo para o novo formato se necessário
  if (Object.keys(leaderboards).length > 0 && Object.keys(playerStats.all_time).length === 0) {
    console.log('📊 Migrando dados antigos de leaderboard para o novo formato...');
    
    // Migra a contagem de abates de cada jogador para as estatísticas de todos os tempos novas
    Object.entries(leaderboards).forEach(([player, kills]) => {
      if (!playerStats.all_time[player]) {
        playerStats.all_time[player] = {
          kills: kills,
          deaths: 0,  // Não temos dados de mortes do formato antigo
          kd: kills,  // K/D é apenas abates quando mortes é 0
          servers: {}
        };
      }
    });
    
    console.log(`✅ Migrados ${Object.keys(leaderboards).length} jogadores do formato antigo`);
    savePlayerStats(playerStats);
  }
}

loadHighlightedPlayers();

// === SALVAMENTO PERIÓDICO DE DADOS ===
// Salva todos os dados a cada 5 minutos independentemente de novos logs
const DATA_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutos
function saveAllData() {
  try {
    // Salva todos os arquivos de dados
    saveSeenLines(seenLines);
    savePlayerStats(playerStats);
    saveLongshots(longshots);
    saveKillstreaks(activeKillstreaks);
    saveLeaderboards(leaderboards); // Legado - mantendo para compatibilidade retroativa
    saveMessageIndexes(messageIndexes);
    saveHighlightedPlayers();
    console.log('✅ Salvamento periódico de dados concluído');
  } catch (err) {
    console.error('❌ Erro durante salvamento periódico de dados:', err.message);
  }
}

// Adiciona desligamento gracioso para salvar dados quando script é terminado
process.on('SIGINT', async () => {
  console.log('📥 Script terminando, salvando todos os dados...');
  saveKillstreaks(activeKillstreaks); // Garante que killstreaks sejam salvas primeiro
  saveAllData();
  console.log('👋 Até mais!');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('📥 Script terminando, salvando todos os dados...');
  saveKillstreaks(activeKillstreaks); // Garante que killstreaks sejam salvas primeiro
  saveAllData();
  console.log('👋 Até mais!');
  process.exit(0);
});
// === AUXILIARES ===
async function getAllLogFiles(sftp, config) {
  const fileList = await sftp.list(config.remoteDir);
  const startFileName = '2025.05.19-00.00.00.csv';

  return fileList
    .filter(f => f.name.endsWith('.csv') && f.name >= startFileName)
    .sort((a, b) => b.modifyTime - a.modifyTime);
}

function hasBlankSegments(row) {
  if (row.length < 7) return true;
  const killer = row[1];
  const victim = row[3];
  if (!killer || !victim || killer.trim() === '' || victim.trim() === '') {
    return true;
  }
  return false;
}

async function parseCSV(content) {
  return new Promise((resolve, reject) => {
    parse(content, {
      delimiter: ';',
      skip_empty_lines: true,
    }, (err, records) => {
      if (err) return reject(err);
      resolve(records);
    });
  });
}

// === FUNÇÃO PRINCIPAL ===
async function fetchAndProcessLogsFromServers() {
  for (const config of serverConfigs) {
    const sftp = new SftpClient();

    try {
      console.log(`🔌 Conectando a ${config.host}...`);
      // Mescla opções de conexão SFTP com config do servidor
      const connectionConfig = {
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        ...(config.connectOptions || {})
      };
      await retryAsync(() => sftp.connect(connectionConfig), 3, 5000); // Mais tentativas, atraso maior
      console.log(`✅ Conectado a ${config.host}`);
      
      console.log(`📋 Listando arquivos em ${config.remoteDir}`);
      const csvFiles = await getAllLogFiles(sftp, config);
      console.log(`📊 Encontrados ${csvFiles.length} arquivos de log`);

      let totalProcessed = 0;

      for (const file of csvFiles) {
        const filePath = config.remoteDir + file.name;
        let content;

        try {
          console.log(`📥 Baixando arquivo ${file.name}...`);
          const fileBuffer = await retryAsync(() => sftp.get(filePath), 3, 3000);
          content = fileBuffer.toString();
          console.log(`✅ Arquivo obtido: ${file.name}`);
        } catch (err) {
          console.error(`❌ Erro ao ler arquivo ${file.name}:`, err.message);
          // Tenta reconectar antes de continuar para próximo arquivo
          try {
            await sftp.end();
            const connectionConfig = {
              host: config.host,
              port: config.port,
              username: config.username,
              password: config.password,
              ...(config.connectOptions || {})
            };
            await retryAsync(() => sftp.connect(connectionConfig), 2, 3000);
          } catch (reconnectErr) {
            console.error(`❌ Falha ao reconectar:`, reconnectErr.message);
          }
          continue;
        }

        const records = await parseCSV(content);
        console.log('✅ Linhas analisadas:', records.length);
        let processed = 0;

        for (const row of records) {
          // Validação básica
          if (!Array.isArray(row) || row.length < 7) {
            console.log('❌ Linha inválida, pulando:', row);
            continue;
          }

          // Verifica segmentos em branco
          if (hasBlankSegments(row)) {
            continue;
          }

          const lineId = row.join(';');
          if (seenLines.has(lineId)) {
            console.log('⚠️ Já vista, pulando');
            continue;
          }

          seenLines.add(lineId);
          processed++;

          const timestamp = row[0];
          const killer = row[1];
          const victim = row[3];
          const cause = row[5];
          const distance = row[6];
          const distanceNum = parseInt(distance);

          // Valida nomes de jogadores
          if (!killer || typeof killer !== 'string' || killer.trim().length === 0) {
            console.warn(`⚠️ Nome de assassino inválido na linha: ${JSON.stringify(row)}`);
            continue;
          }
          if (!victim || typeof victim !== 'string' || victim.trim().length === 0) {
            console.warn(`⚠️ Nome de vítima inválido na linha: ${JSON.stringify(row)}`);
            continue;
          }
          
          // Sanitiza nomes de jogadores (remove espaços em branco, limita tamanho)
          const MAX_PLAYER_NAME_LENGTH = 100; // Limite de nome de usuário do Discord
          const sanitizedKiller = killer.trim().substring(0, MAX_PLAYER_NAME_LENGTH);
          const sanitizedVictim = victim.trim().substring(0, MAX_PLAYER_NAME_LENGTH);
          
          // Valida causa/arma
          if (!cause || typeof cause !== 'string') {
            console.warn(`⚠️ Causa inválida na linha: ${JSON.stringify(row)}`);
            continue;
          }

          // Atualiza estatísticas de jogadores com este abate/morte (usa nomes sanitizados)
          updatePlayerStats(sanitizedKiller, sanitizedVictim, distance, cause, timestamp, config.serverName);

          const isSuicide = sanitizedKiller === sanitizedVictim;
          const causeLower = cause.toLowerCase();

          if (isSuicide || causeLower.includes('suicide') || causeLower.includes('falling') || causeLower.includes('relocation')) {
            // Cria e envia embed de suicídio
            const suicideEmbed = createSuicideEmbed(sanitizedVictim, cause, config.serverName, config);
            await sendEmbedToDiscord(config.suicideWebhook, suicideEmbed);
            
            // Reseta killstreak quando jogador morre para ambiente
            if (activeKillstreaks[sanitizedVictim]) {
              const victimStreak = activeKillstreaks[sanitizedVictim].count;
              
              // Se vítima tinha uma killstreak significativa antes de morrer (3 ou mais), anuncia que terminou
              if (victimStreak >= 3) {
                const victimHighlight = getPlayerHighlight(sanitizedVictim);
                
                const endStreakEmbed = {
                  title: "⚡ Sequência de Abates Terminada!",
                  color: parseInt("DD3333", 16), // Cor vermelha para sequências terminadas
                  description: `A sequência de **${sanitizedVictim}** de **${victimStreak}** abates terminou por **${cause}**!`,
                  thumbnail: { 
                    url: victimHighlight && victimHighlight.thumbnailUrl ? 
                      victimHighlight.thumbnailUrl : 
                      "https://i.imgur.com/6guD1s3.png" 
                  },
                  footer: { 
                    text: config.serverName || "Deadside", 
                    icon_url: config.iconUrl || "https://i.imgur.com/6guD1s3.png" 
                  },
                  timestamp: new Date().toISOString()
                };
                
                await sendEmbedToDiscord(config.killWebhook, endStreakEmbed);
              }
              
              // Reseta a sequência
              activeKillstreaks[sanitizedVictim].count = 0;
              if (config.serverName && activeKillstreaks[sanitizedVictim].servers[config.serverName]) {
                activeKillstreaks[sanitizedVictim].servers[config.serverName].count = 0;
              }
              
              // Salva killstreaks atualizadas
              saveKillstreaks(activeKillstreaks);
            }
          } else {
            // Atualiza killstreak para este abate (usa nomes sanitizados)
            const killstreakResult = updateKillstreak(sanitizedKiller, sanitizedVictim, config.serverName, config);
            
            // Verifica longshot (acima de 200m)
            if (distanceNum >= 200) {
              // Cria e envia embed de longshot
              const longshotEmbed = createLongshotEmbed(sanitizedKiller, sanitizedVictim, cause, distanceNum, config.serverName, config);
              await sendEmbedToDiscord(config.killWebhook, longshotEmbed);
            } else {
              // Cria e envia embed de abate normal
              const killEmbed = createKillEmbed(sanitizedKiller, sanitizedVictim, cause, distanceNum, config.serverName, config);
              await sendEmbedToDiscord(config.killWebhook, killEmbed);
            }
            
            // Se um marco foi atingido, envia anúncio de killstreak
            if (killstreakResult.reached) {
              const killstreakEmbed = createKillstreakEmbed(killstreakResult, config.serverName, config);
              await sendEmbedToDiscord(config.killWebhook, killstreakEmbed);
              
              // Salva killstreaks atualizadas
              saveKillstreaks(activeKillstreaks);
            }
          }
        }

        if (processed > 0) {
          console.log(`✅ Processadas ${processed} novas linhas de ${file.name}`);
          totalProcessed += processed;
        }
      }

      // Fecha a conexão
      try {
        await sftp.end();
        console.log(`🔌 Conexão fechada com ${config.host}`);
      } catch (closeErr) {
        console.error(`⚠️ Erro ao fechar conexão:`, closeErr.message);
      }

      if (totalProcessed > 0) {
        saveSeenLines(seenLines);
        savePlayerStats(playerStats);
        saveLongshots(longshots);
        saveKillstreaks(activeKillstreaks);
        saveMessageIndexes(messageIndexes);
        // Legado - será removido eventualmente
        saveLeaderboards(leaderboards);
      } else {
        console.log(`⚠️ Nenhuma linha nova de ${config.host}`);
      }
    } catch (err) {
      console.error(`❌ Erro ao processar ${config.host}:`, err.message);
      try { 
        await sftp.end();
        console.log(`🔌 Tentativa de fechar conexão com ${config.host}`);
      } catch (closeErr) {
        // Apenas registra e continua
        console.error(`⚠️ Erro ao fechar conexão:`, closeErr.message);
      }
    }
  }
}

// Testa suas URLs de webhook com uma mensagem simples
async function testWebhooks() {
  console.log('🔍 Testando conexões de webhook do Discord...');
  for (const config of serverConfigs) {
    try {
      const testMessage = {
        content: "Testando conexão de webhook..."
      };
      await axios.post(config.killWebhook, testMessage);
      console.log(`✅ Webhook testado com sucesso para ${config.serverName}`);
    } catch (err) {
      console.error(`❌ Erro ao testar webhook para ${config.serverName}:`, err.message);
      console.error(`   URL do Webhook: ${config.killWebhook}`);
      if (err.response) {
        console.error(`   Status: ${err.response.status}`);
        console.error(`   Resposta: ${JSON.stringify(err.response.data)}`);
      }
    }
  }
}

// === INICIALIZAÇÃO E AGENDAMENTO ===
// Migra formato de dados antigos se necessário
migrateOldLeaderboardData();

// Executa limpeza diariamente para remover dados antigos
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas
setInterval(cleanupOldData, CLEANUP_INTERVAL);

// Envia leaderboards a cada 4 horas
const LEADERBOARD_INTERVAL = 4 * 60 * 60 * 1000; // 4 horas
setInterval(sendLeaderboards, LEADERBOARD_INTERVAL);

// Salva todos os dados periodicamente
setInterval(saveAllData, DATA_SAVE_INTERVAL);

// Executa imediatamente na inicialização
setTimeout(sendLeaderboards, 10000);
setTimeout(testWebhooks, 5000);

// Adiciona isto à sua seção de inicialização, após outros timers
// Envia estatísticas de todos os jogadores a cada 12 horas
const ALL_PLAYER_STATS_INTERVAL = 12 * 60 * 60 * 1000; // 12 horas
setInterval(async () => {
  for (const config of serverConfigs) {
    await sendAllPlayerStatsEmbed(config);
    // Atraso entre servidores
    await new Promise(res => setTimeout(res, 2000));
  }
}, ALL_PLAYER_STATS_INTERVAL);

// Chama uma vez na inicialização com um pouco de atraso
setTimeout(async () => {
  for (const config of serverConfigs) {
    await sendAllPlayerStatsEmbed(config);
    await new Promise(res => setTimeout(res, 2000));
  }
}, 15000);

// Executa a validação de URL na inicialização - ADICIONA ESTE NOVO CÓDIGO AQUI
setTimeout(() => {
  console.log('\n==== EXECUTANDO VALIDAÇÃO DE URL DE IMAGEM ====');
  const valid = validateHighlightedPlayerUrls();
  if (valid) {
    console.log('✅ Todos os jogadores em destaque têm URLs de imagem válidas');
  } else {
    console.error('⚠️ Alguns jogadores em destaque têm URLs de imagem faltando - por favor corrija');
  }
  console.log('=======================================\n');
}, 3000);


// Reset único para corrigir quaisquer problemas com jogadores em destaque
setTimeout(() => {
  resetHighlightedPlayers();
}, 6000);


// Inicia servidor Express para endpoints de webhook
const app = express();
const PORT = process.env.PORT || 3000;

// Analisa requisições JSON
app.use(bodyParser.json());

// Adiciona rota para verificação de saúde do servidor
app.get('/health', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// Inicia servidor HTTP
app.listen(PORT, () => {
  console.log(`💻 Servidor rodando na porta ${PORT}`);
  
  // Mensagem de boas-vindas
  console.log('');
  console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
  console.log('┃                       DEADSIDE KILLFEED                           ┃');
  console.log('┃              Integração Aprimorada do Discord v2.0                ┃');
  console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
  console.log('');
  console.log('🔁 Verificando logs a cada 30s...');
  console.log('📊 Leaderboards serão atualizados a cada 4 horas');
  console.log('⚡ Sequências de abates estão sendo rastreadas');
  console.log('🎯 Longshots estão sendo registrados (200m+)');
  console.log('🛡️ Proteção de limite de taxa do Discord habilitada');
  console.log('💬 Formatação de mensagem aprimorada com embeds ricos');
  console.log('');
  
  // Inicia monitoramento
  fetchAndProcessLogsFromServers();
  setInterval(fetchAndProcessLogsFromServers, 30000);
});
