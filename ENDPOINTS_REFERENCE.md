# 📡 Referência Rápida de Endpoints - Backend RTC (Porta 8001)

## 🔗 Base URL
```
http://localhost:8001
```

## 📋 Tabela de Endpoints

| Método | Endpoint | Descrição | Autenticação | Parâmetros |
|--------|----------|-----------|--------------|------------|
| `GET` | `/` | Informações do servidor | Não | - |
| `GET` | `/health` | Health check | Não | - |
| `GET` | `/config` | Configuração do cliente | Não | - |
| `GET` | `/active-streams` | Lista streams ativos | Não | - |
| `GET` | `/available-videos` | Lista vídeos disponíveis | Não | - |
| `GET` | `/detection-data/{client_id}` | Dados de detecção | Não | `client_id` (path) |
| `POST` | `/offer` | WebRTC offer/answer | Não | SDP offer (body) |
| `POST` | `/stop-stream` | Para um stream | Não | `client_id` (query) |
| `WS` | `/ws/detection` | WebSocket para dados real-time | Não | - |

---

## 📖 Detalhes dos Endpoints

### 1️⃣ GET `/` - Root Info

**Descrição**: Retorna informações básicas do servidor

**Exemplo de Request**:
```bash
curl http://localhost:8001/
```

**Resposta**:
```json
{
  "message": "WebRTC Person Detection Backend",
  "status": "running",
  "version": "1.0.0",
  "default_video": "ForBiggerEscapes.mp4",
  "detector_loaded": true
}
```

---

### 2️⃣ GET `/health` - Health Check

**Descrição**: Verifica a saúde do servidor e conexões ativas

**Exemplo de Request**:
```bash
curl http://localhost:8001/health
```

**Resposta**:
```json
{
  "status": "healthy",
  "detector_loaded": true,
  "active_clients": 2,
  "active_websockets": 1,
  "timestamp": 1696531200.123
}
```

**Campos**:
- `status`: Estado do servidor (`healthy` ou `unhealthy`)
- `detector_loaded`: Se o modelo YOLO está carregado
- `active_clients`: Número de clientes WebRTC conectados
- `active_websockets`: Número de WebSockets ativos
- `timestamp`: Unix timestamp

---

### 3️⃣ GET `/config` - Client Config

**Descrição**: Retorna configurações para o cliente

**Exemplo de Request**:
```bash
curl http://localhost:8001/config
```

**Resposta**:
```json
{
  "backend_url": "http://localhost:8000",
  "ws_url": "ws://localhost:8000/ws",
  "rtc_url": "http://localhost:8001",
  "rtc_ws_url": "ws://localhost:8001/ws",
  "default_video_source": "file",
  "default_loop_video": true
}
```

---

### 4️⃣ GET `/active-streams` - Active Streams

**Descrição**: Lista todos os streams WebRTC ativos

**Exemplo de Request**:
```bash
curl http://localhost:8001/active-streams
```

**Resposta**:
```json
{
  "active_streams": [
    {
      "client_id": "drone-1",
      "connected_at": 1696531200.0,
      "connection_state": "connected",
      "has_video": true,
      "has_detection": true,
      "latest_detection": {
        "total_persons": 5,
        "average_confidence": 0.87,
        "positions": [...],
        "timestamp": 1696531200.123
      }
    }
  ],
  "count": 1,
  "timestamp": 1696531200.456
}
```

**Campos**:
- `client_id`: Identificador único do cliente
- `connected_at`: Timestamp da conexão
- `connection_state`: Estado da conexão WebRTC
- `has_video`: Se há track de vídeo
- `has_detection`: Se detecção está ativa
- `latest_detection`: Últimos dados de detecção

---

### 5️⃣ GET `/available-videos` - Available Videos

**Descrição**: Lista vídeos disponíveis na pasta de upload

**Exemplo de Request**:
```bash
curl http://localhost:8001/available-videos
```

**Resposta**:
```json
{
  "videos": [
    {
      "filename": "vecteezy_aerial-view.mp4",
      "path": "/absolute/path/to/video.mp4",
      "size_mb": 25.3
    }
  ],
  "count": 1,
  "upload_folder": "/absolute/path/to/upload",
  "default_video": "ForBiggerEscapes.mp4"
}
```

---

### 6️⃣ GET `/detection-data/{client_id}` - Detection Data

**Descrição**: Obtém dados de detecção de um cliente específico

**Parâmetros**:
- `client_id` (path): ID do cliente

**Exemplo de Request**:
```bash
curl http://localhost:8001/detection-data/drone-1
```

**Resposta (com dados)**:
```json
{
  "client_id": "drone-1",
  "data": {
    "total_persons": 5,
    "average_confidence": 0.87,
    "positions": [
      {
        "id": 0,
        "x_center": 512,
        "y_center": 384,
        "width": 100,
        "height": 150,
        "confidence": 0.85,
        "normalized_x": 0.5,
        "normalized_y": 0.5,
        "normalized_width": 0.1,
        "normalized_height": 0.15
      }
    ],
    "timestamp": 1696531200.123,
    "frame_available": true,
    "frame_number": 150,
    "client_id": "drone-1"
  },
  "timestamp": 1696531200.456
}
```

**Resposta (sem dados)**:
```json
{
  "client_id": "drone-1",
  "data": null,
  "message": "No detection available"
}
```

**Resposta (cliente não encontrado)**:
```json
{
  "detail": "Client not found"
}
```

---

### 7️⃣ POST `/offer` - WebRTC Offer

**Descrição**: Recebe offer WebRTC e retorna answer

**Request Body**:
```json
{
  "sdp": "v=0\r\no=- 123456789...",
  "type": "offer",
  "client_id": "drone-1",
  "source": "file",
  "video_path": "optional/path/to/video.mp4",
  "camera_id": 0,
  "loop_video": true
}
```

**Parâmetros**:
- `sdp`: Session Description Protocol
- `type`: Tipo ("offer")
- `client_id`: ID único do cliente
- `source`: "file" ou "camera" (padrão: "file")
- `video_path`: Caminho do vídeo (opcional)
- `camera_id`: ID da câmera (padrão: 0)
- `loop_video`: Loop do vídeo (padrão: true)

**Resposta**:
```json
{
  "sdp": "v=0\r\no=- 987654321...",
  "type": "answer",
  "client_id": "drone-1",
  "status": "success",
  "detection_enabled": true
}
```

---

### 8️⃣ POST `/stop-stream` - Stop Stream

**Descrição**: Para um stream ativo

**Query Params**:
- `client_id`: ID do cliente

**Exemplo de Request**:
```bash
curl -X POST "http://localhost:8001/stop-stream?client_id=drone-1"
```

**Resposta**:
```json
{
  "status": "stopped",
  "client_id": "drone-1",
  "message": "Stream stopped successfully"
}
```

**Erro (cliente não encontrado)**:
```json
{
  "detail": "Client not found"
}
```

---

### 9️⃣ WebSocket `/ws/detection` - Real-time Detection

**Descrição**: WebSocket para dados de detecção em tempo real

**URL**:
```
ws://localhost:8001/ws/detection
```

**Conexão**:
```javascript
const ws = new WebSocket('ws://localhost:8001/ws/detection');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

**Mensagens do Cliente → Servidor**:

**Ping**:
```json
{
  "type": "ping"
}
```

**Subscribe**:
```json
{
  "type": "subscribe",
  "client_id": "drone-1"
}
```

**Get Status**:
```json
{
  "type": "get_status"
}
```

**Mensagens do Servidor → Cliente**:

**Connected**:
```json
{
  "type": "connected",
  "message": "WebSocket connected successfully",
  "timestamp": 1696531200.0
}
```

**Pong**:
```json
{
  "type": "pong",
  "timestamp": 1696531200.0
}
```

**Status**:
```json
{
  "type": "status",
  "active_clients": 2,
  "detector_loaded": true,
  "timestamp": 1696531200.0
}
```

**Detection Update** (broadcast automático):
```json
{
  "type": "detection_update",
  "client_id": "drone-1",
  "data": {
    "total_persons": 5,
    "average_confidence": 0.87,
    "positions": [...],
    "timestamp": 1696531200.123
  },
  "timestamp": 1696531200.456
}
```

---

## 🎯 Casos de Uso Comuns

### Ver quantos streams estão ativos:
```bash
curl http://localhost:8001/active-streams | jq '.count'
```

### Verificar se detector está carregado:
```bash
curl http://localhost:8001/health | jq '.detector_loaded'
```

### Obter dados de detecção mais recentes:
```bash
curl http://localhost:8001/detection-data/drone-1 | jq '.data'
```

### Listar vídeos disponíveis:
```bash
curl http://localhost:8001/available-videos | jq '.videos[].filename'
```

---

## 🧪 Testando com a Interface Web

Acesse a página de testes:
```
http://localhost:3000/test
```

Esta interface permite:
- ✅ Testar todos os endpoints com um clique
- ✅ Ver respostas formatadas
- ✅ Conectar via WebSocket
- ✅ Enviar mensagens customizadas
- ✅ Monitorar status em tempo real

---

## 📊 Códigos de Status HTTP

| Código | Significado | Quando Ocorre |
|--------|-------------|---------------|
| `200` | OK | Requisição bem-sucedida |
| `404` | Not Found | Cliente/recurso não encontrado |
| `500` | Internal Server Error | Erro no servidor |
| `503` | Service Unavailable | Serviço não inicializado |

---

## 🔐 Segurança

**Nota**: Este servidor está configurado para **desenvolvimento** com CORS aberto (`allow_origins=["*"]`).

⚠️ **Em produção**:
- Configure CORS apropriadamente
- Adicione autenticação
- Use HTTPS/WSS
- Implemente rate limiting

---

## 📝 Notas Adicionais

1. **WebRTC Data Channel**: Dados de detecção também são enviados via WebRTC Data Channel para clientes conectados
2. **Broadcast**: WebSocket envia broadcasts de detecção a cada 100ms (configurável)
3. **Cleanup**: Conexões são limpas automaticamente quando clientes desconectam
4. **Logging**: Todos os eventos são logados no console do servidor

---

## 🆘 Precisa de Ajuda?

- **Backend não inicia**: Verifique se a porta 8001 está livre
- **Detector não carrega**: Certifique-se que `yolov8n.pt` existe em `backend/`
- **CORS errors**: Reinicie o backend
- **WebSocket não conecta**: Use `ws://` não `wss://` em desenvolvimento
