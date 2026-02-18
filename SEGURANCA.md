# Política de Segurança

## Visão Geral

Este documento descreve considerações de segurança e melhores práticas para o Bot Deadside Killfeed.

## Recursos de Segurança

### 1. Gravações Atômicas de Arquivo

O bot usa operações de gravação atômica de arquivo com backup para prevenir corrupção de dados:

- Grava primeiro em arquivos temporários (`.tmp`)
- Cria arquivos de backup antes de sobrescrever (`.backup`)
- Renomeia arquivos atomicamente para prevenir gravações parciais
- Limpeza automática de arquivos temporários em caso de falha

### 2. Configuração por Variáveis de Ambiente

Credenciais sensíveis são armazenadas em variáveis de ambiente:

- Senhas SFTP não são codificadas no código-fonte
- URLs de webhook do Discord são externalizadas
- Configuração é carregada do arquivo `.env` (não commitado no git)

### 3. Tratamento de Erros

- Handlers globais de exceção previnem crashes
- Tratamento de rejeição de promise não manipulada
- Degradação graciosa em erros
- Log de erros detalhado para depuração

### 4. Limitação de Taxa

- Tratamento integrado de limite de taxa da API do Discord
- Sistema de fila de mensagens para prevenir erros 429
- Retry automático com backoff exponencial

### 5. Timeouts de Conexão

- Timeout de 30 segundos para conexões SFTP
- Pacotes keepalive a cada 10 segundos
- Reconexão automática em falhas de conexão

## Vulnerabilidades Reportadas

### Problemas Corrigidos

#### 1. ✅ Objeto de Configuração Vazio (CRÍTICO)
- **Status**: Corrigido na versão atual
- **Descrição**: Configuração do servidor tinha campos vazios
- **Correção**: Migrado para variáveis de ambiente via dotenv

#### 2. ✅ Bug no Cálculo de K/D (MÉDIO)
- **Status**: Corrigido na versão atual
- **Descrição**: Razão K/D estava incorreta quando mortes = 0
- **Correção**: Agora trata adequadamente o caso de divisão por zero

#### 3. ✅ Risco de Corrupção na Gravação de Arquivo (ALTO)
- **Status**: Corrigido na versão atual
- **Descrição**: Gravações não-atômicas de arquivo poderiam corromper dados
- **Correção**: Implementadas operações de gravação atômica com backups

#### 4. ✅ Timeout de Conexão SFTP (ALTO)
- **Status**: Corrigido na versão atual
- **Descrição**: Nenhum timeout configurado para operações SFTP
- **Correção**: Adicionado timeout de 30 segundos e configuração de keepalive

### Problemas Conhecidos

#### 1. ⚠️ Armazenamento de Senha SFTP (MÉDIO)
- **Descrição**: Senha SFTP armazenada em texto plano no arquivo `.env`
- **Risco**: Se o arquivo `.env` for comprometido, credenciais são expostas
- **Mitigação**: 
  - Arquivo `.env` está no `.gitignore` e nunca commitado
  - Recomenda-se definir permissões de arquivo: `chmod 600 .env`
  - Considere usar chaves SSH ao invés de autenticação por senha
- **Melhoria Futura**: Suporte para autenticação por chave SSH

#### 2. ⚠️ Sem Validação de Entrada para Nomes de Jogadores (BAIXO)
- **Descrição**: Nomes de jogadores dos logs não são sanitizados
- **Risco**: Nomes malformados poderiam teoricamente quebrar embeds do Discord
- **Mitigação**: API do Discord trata a maioria dos caracteres especiais com segurança
- **Status**: Baixa prioridade - sem exploits conhecidos

#### 3. ⚠️ Risco de Gravação Concorrente (BAIXO)
- **Descrição**: Múltiplos kills simultâneos poderiam causar colisão de índice de frase
- **Risco**: Mesma frase de kill pode ser usada duas vezes em rápida sucessão
- **Mitigação**: Extremamente raro em condições normais de jogo
- **Status**: Baixa prioridade - problema apenas cosmético

## Melhores Práticas

### Segurança de Implantação

1. **Permissões de Arquivo**
   ```bash
   chmod 600 .env  # Proteger arquivo de ambiente
   chmod 700 *.json  # Proteger arquivos de dados
   ```

2. **Isolamento de Usuário**
   - Execute o bot como um usuário não-privilegiado
   - Não execute como root/administrador
   - Use uma conta de serviço dedicada

3. **Segurança de Rede**
   - Use regras de firewall para restringir acesso SFTP
   - Considere VPN para conexões SFTP
   - Use HTTPS para webhooks do Discord (padrão)

4. **Controle de Acesso**
   - Limite quem tem acesso ao servidor
   - Rotacione regularmente as credenciais SFTP
   - Monitore o uso de webhooks no Discord

### Proteção de Dados

1. **Estratégia de Backup**
   ```bash
   # Exemplo de script de backup automatizado
   tar -czf backup-$(date +%Y%m%d).tar.gz *.json
   ```

2. **Retenção de Dados**
   - Bot limpa automaticamente dados com mais de 30 dias
   - Faça backup manual antes de atualizações importantes
   - Teste procedimentos de restauração regularmente

3. **Dados Sensíveis**
   - Estatísticas de jogadores não são consideradas sensíveis
   - URLs de webhook devem ser mantidas privadas
   - Credenciais SFTP devem ser protegidas

### Monitoramento

1. **Revisão de Logs**
   - Verifique logs regularmente para erros
   - Monitore falhas repetidas de conexão
   - Observe avisos de limite de taxa

2. **Verificações de Saúde**
   - Use o endpoint `/health` para monitoramento
   - Configure alertas para tempo de inatividade
   - Rastreie tempos de resposta

3. **Atividade no Discord**
   - Monitore atividade de postagem de webhook
   - Verifique padrões inesperados
   - Verifique precisão dos dados

## Reportando Problemas de Segurança

Se você descobrir uma vulnerabilidade de segurança:

1. **NÃO** crie uma issue pública no GitHub
2. Envie email diretamente ao mantenedor (se disponível)
3. Forneça informações detalhadas:
   - Descrição da vulnerabilidade
   - Passos para reproduzir
   - Impacto potencial
   - Correção sugerida (se houver)

## Processo de Atualização de Segurança

Quando atualizações de segurança são lançadas:

1. Atualizações serão documentadas nos releases
2. Atualizações críticas serão claramente marcadas
3. Mudanças significativas serão anunciadas
4. Guias de migração serão fornecidos

## Conformidade

### Privacidade de Dados

- Bot processa apenas estatísticas de jogo (kills, mortes)
- Nenhuma informação pessoal é coletada
- Nomes de jogadores são apenas usernames do jogo
- Dados são armazenados localmente, não transmitidos para outros lugares

### Termos de Serviço do Discord

- Bot cumpre com os limites de taxa da API do Discord
- Webhooks são usados conforme o pretendido
- Sem spam ou abuso de serviços do Discord
- Respeita políticas de conteúdo do Discord

## Checklist de Segurança

Antes de implantar em produção:

- [ ] Arquivo `.env` criado com todas as variáveis necessárias
- [ ] Arquivo `.env` tem permissões adequadas (600)
- [ ] `.gitignore` inclui `.env` e arquivos sensíveis
- [ ] Credenciais SFTP testadas e funcionando
- [ ] Webhooks do Discord testados e funcionando
- [ ] Bot executa como usuário não-privilegiado
- [ ] Regras de firewall configuradas
- [ ] Estratégia de backup implementada
- [ ] Monitoramento/alertas configurados
- [ ] Endpoint de verificação de saúde acessível

## Recursos Adicionais

- [Melhores Práticas de Segurança do Node.js](https://nodejs.org/en/docs/guides/security/)
- [Documentação da API do Discord](https://discord.com/developers/docs/intro)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## Histórico de Versões

| Versão | Data | Mudanças |
|---------|------|---------|
| 1.0.0 | 2024 | Documentação de segurança inicial |
| 1.1.0 | 2024 | Adicionadas gravações atômicas de arquivo, variáveis de ambiente, timeouts SFTP |
