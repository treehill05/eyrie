# Configuração de Polling HTTP para Detecção em Tempo Real

## 🎯 Objetivo
Usar **polling HTTP** em vez de WebSocket para receber dados de detecção do backend, já que apenas a porta 8001 está exposta via ngrok.

---

## ✅ Mudanças Implementadas

### 1. **Frontend - RTCProvider** (`frontend/app/[drone_id]/_components/rtc/index.tsx`)

#### **Antes: WebSocket**
```typescript
const ws = new WebSocket(`${wsUrl}/ws/detection`);
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === "detection_update") {
    addData(message.data);
  }
};
```

#### **Depois: HTTP Polling**
```typescript
// Poll a cada 100ms para atualizações em tempo real
const pollDetectionData = async () => {
  try {
    const response = await fetch(`${backendUrl}/detection-data/${droneId}`);
    
    if (response.ok) {
      const result = await response.json();
      
      if (result.data && result.data.total_persons !== undefined) {
        console.log("Detection data received:", result.data);
        addData(result.data);
      }
    } else if (response.status === 404) {
      console.warn("Client not found on backend");
    }
  } catch (error) {
    console.error("Error polling detection data:", error);
  }
};

pollingIntervalRef.current = setInterval(pollDetectionData, 100);
```

#### **Mudanças de Refs**
- ❌ Removido: `webSocketRef`
- ✅ Adicionado: `pollingIntervalRef`

#### **Cleanup Atualizado**
```typescript
// No disconnect e error handling
if (pollingIntervalRef.current) {
  clearInterval(pollingIntervalRef.current);
  pollingIntervalRef.current = null;
}
```

---

### 2. **Fix de Hidratação - Layout e Page**

#### **Problema**
Erro de hidratação do React porque componentes com estado do cliente estavam sendo renderizados no servidor (SSR).

#### **Solução**

**`frontend/app/[drone_id]/layout.tsx`**
```typescript
"use client";  // ← Adicionado

import RTCProvider from "./_components/rtc";
import VideoProvider from "./_components/video/provider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RTCProvider>
      <VideoProvider>{children}</VideoProvider>
    </RTCProvider>
  );
}
```

**`frontend/app/[drone_id]/page.tsx`**
```typescript
"use client";  // ← Adicionado

// ...imports...

export default function Page() {  // ← Removido "async"
  return (
    <ResizablePanelGroup ...>
      {/* ... */}
    </ResizablePanelGroup>
  );
}
```

---

## 🔄 Fluxo de Dados Atualizado

```
┌──────────────────────────────────────────────────────┐
│  Backend (rtc_server.py) - Porta 8001               │
│                                                      │
│  1. ProcessedVideoTrack processa frames com YOLO    │
│  2. detection_data armazenado em memory             │
│  3. GET /detection-data/{client_id} retorna dados   │
└──────────────────────────────────────────────────────┘
                        ↓
           HTTP Polling (a cada 100ms)
                        ↓
┌──────────────────────────────────────────────────────┐
│  Frontend (RTCProvider)                              │
│                                                      │
│  1. setInterval chama fetch() a cada 100ms          │
│  2. Recebe JSON com detection data                  │
│  3. addData() adiciona ao dataHistory[]             │
│  4. Graph component renderiza gráficos              │
└──────────────────────────────────────────────────────┘
```

---

## 📊 Formato de Dados Recebidos

### **Endpoint: GET `/detection-data/{client_id}`**

**Response:**
```json
{
  "client_id": "drone-1",
  "data": {
    "total_persons": 5,
    "average_confidence": 0.85,
    "positions": [
      {
        "id": 0,
        "x_center": 666.5284423828125,
        "y_center": 445.75885009765625,
        "width": 943.052490234375,
        "height": 544.9644775390625,
        "confidence": 0.8326842784881592,
        "normalized_x": 0.5207253456115722,
        "normalized_y": 0.6191095140245225,
        "normalized_width": 0.7367597579956054,
        "normalized_height": 0.7568951076931424
      }
    ],
    "timestamp": 1704567890123,
    "frame_number": 150,
    "client_id": "drone-1"
  },
  "timestamp": 1704567890.123
}
```

---

## ⚙️ Como Funciona

### **1. Conexão Inicial**
```typescript
// Cliente conecta via WebRTC
await connect(droneId);

// WebRTC estabelecido para vídeo
// Polling HTTP iniciado para dados de detecção
```

### **2. Loop de Polling**
```typescript
// A cada 100ms:
1. fetch(`http://localhost:8001/detection-data/${droneId}`)
2. Se response.ok → parse JSON
3. Se data.total_persons existe → addData(data)
4. Dados adicionados ao dataHistory[]
5. Graph component re-renderiza automaticamente
```

### **3. Desconexão**
```typescript
disconnect() {
  // Para WebRTC
  peerConnection.close();
  
  // Para polling HTTP
  clearInterval(pollingIntervalRef.current);
}
```

---

## 🚀 Vantagens do HTTP Polling

1. **✅ Funciona com ngrok** - Apenas porta 8001 necessária
2. **✅ Simples de debugar** - Requisições HTTP visíveis no Network tab
3. **✅ Sem problemas de WebSocket** - Evita issues com proxies/firewalls
4. **✅ Retry automático** - fetch() pode ser facilmente retry-ado

## ⚠️ Desvantagens

1. **🔸 Mais overhead** - Requisições HTTP a cada 100ms
2. **🔸 Latência ligeiramente maior** - Comparado com WebSocket push
3. **🔸 Mais tráfego** - Headers HTTP em cada request

---

## 🧪 Como Testar

### **1. Iniciar Backend**
```bash
cd backend
python rtc_server.py
```

### **2. Verificar Endpoint**
```bash
# Teste manual
curl http://localhost:8001/detection-data/test-id
```

### **3. Iniciar Frontend**
```bash
cd frontend
npm run dev
```

### **4. Verificar no Browser**
1. Abrir console (F12)
2. Ir para `/drone-1`
3. Conectar ao stream
4. Ver logs: `"Detection data received:"`
5. Ver gráficos atualizando em tempo real

### **5. Verificar Network Tab**
- Abrir DevTools → Network
- Filtrar por `detection-data`
- Ver requisições a cada 100ms
- Status: 200 OK com dados JSON

---

## 🔧 Configuração

### **Ajustar Frequência de Polling**
```typescript
// Em rtc/index.tsx, linha 221
pollingIntervalRef.current = setInterval(pollDetectionData, 100);
//                                                          ^^^
//                                                          ms
```

**Recomendações:**
- `50ms` - Tempo real mais responsivo (mais tráfego)
- `100ms` - Balanceado (padrão) ✅
- `200ms` - Mais leve (menos tráfego)
- `500ms` - Economiza banda (menos real-time)

---

## 📝 Notas Importantes

1. **Backend já tinha o endpoint** - `/detection-data/{client_id}` já existia
2. **Dados em memória** - `ProcessedVideoTrack.last_detection_data` armazena último frame
3. **Client ID deve existir** - O cliente precisa ter uma conexão WebRTC ativa
4. **Erro 404 é normal** - Se o cliente ainda não conectou ou desconectou

---

## ✨ Próximos Passos (Opcional)

1. **Adicionar retry logic** - Se fetch falhar, tentar novamente
2. **Adaptive polling** - Ajustar frequência baseado em carga
3. **Compression** - Usar gzip nas respostas HTTP
4. **Caching** - Evitar enviar dados duplicados
5. **Server-Sent Events (SSE)** - Alternativa ao polling mais eficiente
