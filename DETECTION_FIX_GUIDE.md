# Guia para Corrigir Detecção e Transmissão de Dados

## Problemas Identificados

1. **Servidor RTC não está rodando** (porta 8001)
2. **Dependências Python não instaladas**
3. **WebSocket de detecção não estava conectado no frontend** ✅ (já corrigido)

## Soluções

### 1. Instalar Dependências Python

```bash
cd backend
pip install -r requirements.txt
```

**Nota**: A instalação do PyTorch pode demorar. Se você tiver GPU NVIDIA, instale a versão com CUDA:
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### 2. Iniciar o Servidor RTC

Opção A - Usar o script de start:
```bash
cd backend
python start_rtc_server.py
```

Opção B - Iniciar manualmente:
```bash
cd backend
python rtc_server.py
```

O servidor deve iniciar na porta **8001** e você verá logs como:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Model loaded successfully from yolov8n.pt
INFO:     Person detector initialized successfully
INFO:     Connection manager initialized
INFO:     Detection broadcast loop started
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001
```

### 3. Verificar se o Detector está Carregado

Acesse: http://localhost:8001/

Você deve ver:
```json
{
  "message": "WebRTC Person Detection Backend",
  "status": "running",
  "version": "1.0.0",
  "default_video": "ForBiggerEscapes.mp4",
  "detector_loaded": true  // <-- DEVE SER true
}
```

Se `detector_loaded` for `false`, verifique os logs de erro no terminal.

### 4. Testar o Endpoint de Health

```bash
curl http://localhost:8001/health
```

Deve retornar:
```json
{
  "status": "healthy",
  "detector_loaded": true,
  "active_clients": 0,
  "active_websockets": 0,
  "timestamp": 1234567890.123
}
```

### 5. Iniciar o Frontend

Em outro terminal:
```bash
cd frontend
npm run dev
```

### 6. Testar a Conexão

1. Abra http://localhost:3000
2. Crie ou acesse um drone
3. O vídeo deve começar a streaming
4. As boxes verdes devem aparecer ao redor das pessoas detectadas
5. Abra o console do navegador (F12) e procure por:
   ```
   WebSocket connected for detection data
   Detection data received: {total_persons: X, ...}
   ```

## Alterações Feitas no Código

### Frontend (já aplicado)

**Arquivo**: `frontend/app/[drone_id]/_components/rtc/index.tsx`

**Mudanças**:
1. Adicionado `webSocketRef` para gerenciar conexão WebSocket separada
2. Conecta ao endpoint `/ws/detection` após estabelecer conexão WebRTC
3. Recebe mensagens do tipo `detection_update` e adiciona ao `dataHistory`
4. Fecha WebSocket corretamente no `disconnect()`

**Arquivo**: `frontend/app/[drone_id]/_components/rtc/types.d.ts`

**Mudanças**:
1. Adicionado campos opcionais `frame_number` e `client_id` ao tipo `DetectionData`

## Como Funciona o Fluxo de Detecção

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│   Video      │          │   Backend    │          │   Frontend   │
│   File       │          │   RTC Server │          │   Browser    │
└──────┬───────┘          └──────┬───────┘          └──────┬───────┘
       │                         │                         │
       │  1. Read frame          │                         │
       ├────────────────────────>│                         │
       │                         │                         │
       │                         │  2. YOLO Detection      │
       │                         │  (draw boxes)           │
       │                         │                         │
       │                         │  3. Stream via WebRTC   │
       │                         ├────────────────────────>│
       │                         │  (video com boxes)      │
       │                         │                         │
       │                         │  4. Send data via WS    │
       │                         ├────────────────────────>│
       │                         │  (positions, confidence)│
       │                         │                         │
       │                         │                         │  5. Render
       │                         │                         │  overlays
```

## Troubleshooting

### Problema: "Model not loaded" ou detector_loaded: false

**Causa**: PyTorch ou Ultralytics não instalado corretamente

**Solução**:
```bash
pip uninstall torch torchvision ultralytics
pip install torch torchvision
pip install ultralytics
```

### Problema: Video stream funciona mas sem boxes

**Causa 1**: Detector não inicializou
- Verifique logs do servidor para erros de import
- Confirme que `detector_loaded: true` no `/health`

**Causa 2**: Nenhuma pessoa detectada no vídeo
- Teste com o vídeo default: `crowd-of-people-timelapse-SBV-304899215-preview.mp4`
- Verifique threshold de confiança em `backend/config.py` (deve ser ~0.5)

### Problema: WebSocket não conecta

**Sintoma**: Console mostra "WebSocket error" ou "WebSocket closed"

**Solução**:
1. Verifique se o servidor está rodando: `curl http://localhost:8001/health`
2. Teste o WebSocket manualmente:
```javascript
// No console do browser
const ws = new WebSocket('ws://localhost:8001/ws/detection');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', e.data);
```

### Problema: Data recebida mas com valores null

**Causa**: Backend não está processando frames

**Solução**:
1. Verifique se há um `ProcessedVideoTrack` para o cliente:
```bash
curl http://localhost:8001/active-streams
```

2. Deve mostrar `has_detection: true` para o cliente

## Verificação Final

Após aplicar todas as correções, você deve ver:

✅ Servidor backend rodando na porta 8001  
✅ `detector_loaded: true` no endpoint de health  
✅ Video streaming com boxes verdes ao redor de pessoas  
✅ Console do browser mostrando "Detection data received"  
✅ Dados de detecção não são null  
✅ Os overlays de "points" ou "heatmap" funcionam corretamente  

## Próximos Passos

Se tudo estiver funcionando:
- Os dados de detecção estarão disponíveis em `dataHistory` no contexto RTC
- Os componentes `VideoPoints` e `VideoHeatmap` devem renderizar corretamente
- O gráfico de análise deve mostrar dados em tempo real
