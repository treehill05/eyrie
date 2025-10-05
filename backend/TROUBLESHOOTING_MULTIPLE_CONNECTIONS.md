# 🔧 Solução de Problemas - Múltiplas Conexões WebRTC

## ✅ Problemas Corrigidos

### 1. **Erro 404 em `/ice-servers`**
- **Problema**: Frontend tentava enviar ICE servers para endpoint inexistente
- **Solução**: Adicionado endpoint `POST /ice-servers` no backend
- **Status**: ✅ Corrigido

### 2. **Falhas ICE com múltiplas conexões**
- **Problema**: Configuração ICE insuficiente para NATs restritivos
- **Solução**: 
  - Múltiplos servidores STUN
  - Configuração ICE dinâmica por conexão
  - Melhor tratamento de erros ICE
- **Status**: ✅ Corrigido

### 3. **Colisão de Client IDs**
- **Problema**: Mesmo client_id usado em múltiplas instâncias
- **Solução**: Auto-geração de IDs únicos com sufixo
- **Status**: ✅ Corrigido

### 4. **Erros de Memória do Encoder**
- **Problema**: Múltiplas instâncias de VideoFileTrack
- **Solução**: Sistema de tracks compartilhados
- **Status**: ✅ Corrigido

---

## 🧪 Como Testar

### 1. **Teste Automático**
```bash
cd backend
python test_multiple_connections.py
```

### 2. **Teste Manual**
```bash
# Terminal 1: Iniciar servidor
cd backend
python rtc_server.py

# Terminal 2: Abrir primeira instância
cd frontend
npm run dev

# Terminal 3: Abrir segunda instância em porta diferente
cd frontend
npm run dev -- --port 3001

# Terminal 4: Abrir terceira instância
cd frontend
npm run dev -- --port 3002
```

### 3. **Verificar Logs**
```bash
# Monitorar logs do servidor
tail -f backend/rtc_server.log

# Verificar conexões ativas
curl http://localhost:8001/connection-stats
```

---

## 📊 Monitoramento

### Endpoints de Monitoramento

1. **`GET /connection-stats`** - Estatísticas detalhadas
2. **`GET /health`** - Status geral do servidor
3. **`GET /active-streams`** - Streams ativos
4. **`GET /available-videos`** - Vídeos disponíveis

### Exemplo de Resposta `/connection-stats`:
```json
{
  "active_clients": 3,
  "shared_tracks": {
    "shared_video_tracks": 1,
    "shared_processed_tracks": 1,
    "active_clients": 3
  },
  "websocket_connections": 2,
  "detector_loaded": true,
  "clients": [
    {
      "client_id": "drone-1",
      "connection_state": "connected",
      "ice_state": "completed",
      "created_at": 1699123456.789,
      "has_processed_track": true
    }
  ]
}
```

---

## 🚨 Problemas Conhecidos e Soluções

### 1. **ICE Connection Failed**
**Sintomas**: 
- Logs mostram "ICE failed"
- Conexão não estabelece

**Soluções**:
1. Verificar firewall/proxy
2. Usar TURN servers (configurar credenciais)
3. Testar com diferentes STUN servers

**Configuração TURN**:
```env
# No arquivo .env
TURN_USERNAME=seu_usuario
TURN_CREDENTIAL=sua_senha
TURN_URLS=turn:seu-servidor.com:3478
```

### 2. **Client ID Collision**
**Sintomas**:
- Warnings sobre colisão de IDs
- Conexões inesperadas

**Solução**: Sistema agora gera IDs únicos automaticamente

### 3. **Memory Allocation Errors**
**Sintomas**:
- "Failed to initialize encoder: Memory allocation error"
- Servidor crasha

**Solução**: Tracks compartilhados implementados

### 4. **Video Not Playing**
**Sintomas**:
- Conexão estabelece mas vídeo não aparece

**Verificações**:
1. Arquivo de vídeo existe em `backend/upload/`
2. Formato compatível (MP4 recomendado)
3. Check logs para erros de codec

---

## 🔧 Configurações Avançadas

### 1. **Limitar Número de Conexões**
```python
# Em rtc_server.py, modificar ConnectionManager
MAX_CONNECTIONS = 10

def add_client(self, client_id: str, pc: RTCPeerConnection):
    if len(self.clients) >= MAX_CONNECTIONS:
        raise HTTPException(status_code=503, detail="Maximum connections reached")
    # ... resto do código
```

### 2. **Timeout de Conexão**
```python
# Adicionar timeout para conexões
CONNECTION_TIMEOUT = 30000  # 30 segundos

@pc.on("iceconnectionstatechange")
async def on_iceconnectionstatechange():
    if pc.iceConnectionState == "checking":
        # Iniciar timer
        await asyncio.sleep(30)
        if pc.iceConnectionState == "checking":
            logger.warning(f"[{client_id}] ICE timeout, closing connection")
            await connection_manager.remove_client(client_id)
```

### 3. **Logs Detalhados**
```python
# Adicionar ao início do arquivo
logging.getLogger("aiortc").setLevel(logging.DEBUG)
logging.getLogger("aioice").setLevel(logging.DEBUG)
```

---

## 📈 Performance

### Métricas Esperadas
- **Conexões simultâneas**: 5-10 (depende do hardware)
- **Latência**: < 200ms para conexão local
- **Uso de CPU**: ~30% por conexão (com detecção)
- **Uso de Memória**: ~100MB base + ~50MB por conexão

### Otimizações
1. **Reduzir resolução do vídeo** para múltiplas conexões
2. **Desabilitar detecção** se não necessária
3. **Usar codec H.264** em vez de VP8
4. **Implementar rate limiting** para conexões

---

## 🆘 Suporte

Se ainda tiver problemas:

1. **Verificar logs**: `tail -f backend/rtc_server.log`
2. **Testar endpoints**: `curl http://localhost:8001/health`
3. **Verificar recursos**: `curl http://localhost:8001/connection-stats`
4. **Executar teste**: `python backend/test_multiple_connections.py`

### Logs Importantes
- `Creating new shared video track` - Primeira conexão
- `Using shared video track` - Conexões subsequentes  
- `Client ID collision detected` - IDs duplicados
- `ICE connection failed` - Problemas de rede
- `Memory allocation error` - Problemas de recursos
