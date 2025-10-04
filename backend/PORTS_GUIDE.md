# 🔌 Guia de Separação de Portas

## 📊 Arquitetura de Dois Servidores

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Port 3000)                  │
│                  http://localhost:3000                   │
└────────────────┬──────────────────────┬─────────────────┘
                 │                      │
                 ▼                      ▼
    ┌────────────────────┐   ┌────────────────────┐
    │   MAIN SERVER      │   │   RTC SERVER       │
    │   Port 8000        │   │   Port 8001        │
    │   main.py          │   │   rtc_server.py    │
    │                    │   │                    │
    │   📷 Camera API    │   │   🎥 Video File    │
    │   MJPEG Stream     │   │   WebRTC Stream    │
    └────────────────────┘   └────────────────────┘
```

---

## 🎯 Separação de Responsabilidades

### **Port 8000 - Main Server** (`main.py`)
**Função:** Controle de câmera do dispositivo

**Endpoints:**
- `GET /health` - Status do servidor
- `POST /start_camera` - Inicia câmera
- `POST /stop_camera` - Para câmera
- `GET /video_feed` - Stream MJPEG
- `POST /detect_from_base64` - Detecção de imagem
- `WS /ws` - WebSocket dados em tempo real

**Configuração:**
```env
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
```

---

### **Port 8001 - RTC Server** (`rtc_server.py`)
**Função:** Streaming de vídeo de arquivo via WebRTC

**Endpoints:**
- `GET /health` - Status do servidor
- `POST /offer` - WebRTC offer/answer
- `GET /active-streams` - Streams ativos
- `GET /detection-data/{client_id}` - Dados de detecção
- `WS /ws/detection` - WebSocket detecção

**Configuração:**
```env
RTC_PORT=8001
```

**Vídeo:**
- Arquivo: `ForBiggerEscapes.mp4`
- Loop automático

---

## 🚀 Scripts de Gerenciamento

### Iniciar Ambos os Servidores
```bash
./start_both_servers.sh
```

### Iniciar Apenas Main Server (Camera)
```bash
./start_main_server.sh
```
ou
```bash
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Iniciar Apenas RTC Server (Video)
```bash
./start_rtc_only.sh
```
ou
```bash
python3 -m uvicorn rtc_server:app --host 0.0.0.0 --port 8001 --reload
```

### Parar Todos os Servidores
```bash
./stop_servers.sh
```

### Parar Porta Específica
```bash
# Porta 8000
lsof -ti:8000 | xargs kill -9

# Porta 8001
lsof -ti:8001 | xargs kill -9
```

---

## ⚙️ Configuração

### Backend (.env)
```env
# Server Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# RTC Server Port
RTC_PORT=8001

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_RTC_URL=http://localhost:8001
```

---

## 🌐 Frontend - Página /dev

### Configuração no Código
```typescript
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const RTC_URL = process.env.NEXT_PUBLIC_RTC_URL || "http://localhost:8001";
```

### Controles Disponíveis

**📷 Device Camera (Port 8000)**
- Botão: "Start Camera" / "Stop Camera"
- Função: Ativa câmera real do dispositivo
- API: `http://localhost:8000/start_camera`

**🎥 RTC Video Stream (Port 8001)**
- Botão: "Start RTC Stream" / "Stop RTC"
- Função: Reproduz vídeo de arquivo via WebRTC
- API: `http://localhost:8001/health`

---

## ✅ Verificação de Status

### Via Terminal
```bash
# Main Server
curl http://localhost:8000/health | python3 -m json.tool

# RTC Server
curl http://localhost:8001/health | python3 -m json.tool
```

### Via Browser
- Main Server: http://localhost:8000/docs
- RTC Server: http://localhost:8001/docs

---

## 🔍 Troubleshooting

### Porta já em uso
```bash
# Ver processo usando a porta
lsof -i :8000
lsof -i :8001

# Matar processo
lsof -ti:8000 | xargs kill -9
lsof -ti:8001 | xargs kill -9
```

### Servidor não inicia
1. Verificar logs:
   ```bash
   tail -f main_server.log
   tail -f rtc_server.log
   ```

2. Verificar dependências:
   ```bash
   pip install -r requirements.txt
   ```

3. Verificar arquivo de vídeo:
   ```bash
   ls -lh ForBiggerEscapes.mp4
   ```

### Frontend não conecta
1. Verificar variáveis de ambiente do frontend
2. Reiniciar servidor Next.js:
   ```bash
   cd frontend
   npm run dev
   ```

---

## 📁 Arquivos Modificados

### Backend
- ✅ `backend/config.py` - Configurações centralizadas
- ✅ `backend/main.py` - Usa `config.BACKEND_PORT`
- ✅ `backend/rtc_server.py` - Usa `config.RTC_PORT`
- ✅ `backend/.env` - Variáveis `BACKEND_PORT` e `RTC_PORT`

### Frontend
- ✅ `frontend/.env` - URLs para ambos os servidores
- ✅ `frontend/app/dev/page.tsx` - Lógica para dois modos
- ✅ `frontend/app/dev/components/ControlPanel.tsx` - Controles separados

### Scripts
- ✅ `start_both_servers.sh` - Inicia ambos
- ✅ `start_main_server.sh` - Inicia Main Server
- ✅ `start_rtc_only.sh` - Inicia RTC Server
- ✅ `stop_servers.sh` - Para todos

---

## 🎨 Identificação Visual

### Main Server (Camera)
- Cor: 🔵 Azul/Verde
- Badge: "Camera is streaming" (verde)
- Ícone: 📷

### RTC Server (Video)
- Cor: 🟣 Roxo
- Badge: "RTC video is streaming" (roxo)
- Ícone: 🎥

---

## 🔐 Segurança

Para produção, ajustar:

1. **CORS**:
   ```python
   CORS_ORIGINS = [FRONTEND_URL]  # Remove "*"
   ```

2. **Portas**:
   - Considere usar HTTPS (443)
   - Configure firewall adequadamente

3. **Variáveis de Ambiente**:
   - Use `.env` apenas local
   - Em produção use secrets management

---

## 📊 Monitoramento

### Logs em Tempo Real
```bash
# Main Server
tail -f backend/main_server.log

# RTC Server
tail -f backend/rtc_server.log
```

### Status Rápido
```bash
# Ver processos Python rodando
ps aux | grep uvicorn

# Ver portas em uso
netstat -an | grep -E "8000|8001"
```
