# 🔓 Como Passar pela Verificação do Ngrok

## ✅ Solução Implementada

A página de testes já está configurada para **bypass automático** do interstitial do ngrok!

### Headers Adicionados

```typescript
headers: {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",  // ← Bypass do ngrok
  "User-Agent": "EndpointTester/1.0",     // ← User-Agent customizado
}
```

## 🎯 Como Funciona

### O Problema
Quando você acessa um URL do ngrok pelo navegador, ele mostra uma página HTML de aviso:
```
You are about to visit [seu-dominio].ngrok-free.dev
(ERR_NGROK_6024)
```

### A Solução
O ngrok verifica o **User-Agent** e mostra o interstitial apenas para navegadores comuns. Quando você adiciona o header `ngrok-skip-browser-warning`, ele bypassa essa verificação.

## 📋 Como Usar

### 1. Na Página de Testes (Já Configurado!)

Simplesmente use a página `/test` normalmente:

```bash
# 1. Inicie o backend
cd backend
python rtc_server.py

# 2. Configure ngrok (em outro terminal)
ngrok http 8001

# 3. Acesse a página de testes
# http://localhost:3000/test

# 4. Configure o Backend URL com a URL do ngrok
# Exemplo: https://1234-5678.ngrok-free.app
```

✅ **O bypass já está funcionando automaticamente!**

### 2. Em Outros Lugares (fetch/axios)

Se você precisar fazer requisições em outras partes do código:

**Fetch:**
```typescript
const response = await fetch('https://seu-dominio.ngrok-free.app/endpoint', {
  headers: {
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'MyApp/1.0',
  }
});
```

**Axios:**
```typescript
const response = await axios.get('https://seu-dominio.ngrok-free.app/endpoint', {
  headers: {
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'MyApp/1.0',
  }
});
```

### 3. No cURL

```bash
curl -H "ngrok-skip-browser-warning: true" \
     -H "User-Agent: curl/7.0" \
     https://seu-dominio.ngrok-free.app/health
```

### 4. No Postman

1. Abra o Postman
2. Vá para **Headers**
3. Adicione:
   - Key: `ngrok-skip-browser-warning`
   - Value: `true`
4. Adicione:
   - Key: `User-Agent`
   - Value: `Postman/1.0`

## 🌐 WebSocket com Ngrok

Para WebSocket, use **wss://** (não ws://):

```typescript
const ws = new WebSocket('wss://seu-dominio.ngrok-free.app/ws/detection');
```

**Nota:** A página de testes converte automaticamente:
- `http://` → `ws://`
- `https://` → `wss://`

## 🔧 Testando o Bypass

### Teste 1: Health Check
```bash
# Com ngrok rodando na porta 8001
curl -H "ngrok-skip-browser-warning: true" \
     https://1234-5678.ngrok-free.app/health
```

**Esperado:** JSON response (não HTML)
```json
{
  "status": "healthy",
  "detector_loaded": true,
  ...
}
```

### Teste 2: Na Página de Testes
1. Acesse `http://localhost:3000/test`
2. Configure Backend URL: `https://1234-5678.ngrok-free.app`
3. Clique em "Test Endpoint" em qualquer card
4. ✅ Deve retornar JSON (não erro de parse)

## 🚫 Limitações do Ngrok Free

Mesmo com o bypass, o **ngrok gratuito** tem limitações:

1. **Rate Limiting**: 40 requisições/minuto
2. **Timeout**: Conexões longas podem ser interrompidas
3. **Random Subdomains**: URL muda cada vez que reinicia
4. **WebRTC TURN**: Pode ter problemas com NAT traversal

### Solução: Ngrok Pro ou Localhost

**Para desenvolvimento:**
```bash
# Use localhost sempre que possível
http://localhost:8001
```

**Para produção:**
- Ngrok Pro/Business: Domínios fixos, mais requests
- Cloudflare Tunnel: Alternativa gratuita
- Deploy em servidor VPS: Controle total

## 🎛️ Alternativas ao Ngrok

### 1. Cloudflare Tunnel (Gratuito)
```bash
cloudflared tunnel --url http://localhost:8001
```
**Vantagens:**
- Gratuito e ilimitado
- Sem interstitial
- Melhor performance

### 2. Localtunnel (Gratuito)
```bash
npx localtunnel --port 8001
```
**Vantagens:**
- Simples de usar
- Sem cadastro

### 3. Serveo (Gratuito)
```bash
ssh -R 80:localhost:8001 serveo.net
```
**Vantagens:**
- Usa SSH
- Sem instalação

## 🔍 Debug

### Se ainda receber erro HTML:

**1. Verifique os headers:**
```javascript
console.log('Request headers:', options.headers);
```

**2. Verifique a resposta:**
```javascript
const response = await fetch(url, options);
console.log('Content-Type:', response.headers.get('content-type'));
const text = await response.text();
console.log('Response:', text);
```

**3. Teste com cURL:**
```bash
curl -v -H "ngrok-skip-browser-warning: true" https://seu-dominio.ngrok-free.app/health
```

### Se WebSocket não conectar:

**1. Use wss:// para HTTPS:**
```typescript
// ❌ Errado
const ws = new WebSocket('ws://dominio.ngrok-free.app/ws');

// ✅ Correto
const ws = new WebSocket('wss://dominio.ngrok-free.app/ws');
```

**2. Verifique logs do backend:**
```bash
# Terminal do backend deve mostrar:
INFO:     WebSocket connected
```

**3. Teste WebSocket direto:**
```bash
# Use websocat ou similar
websocat wss://seu-dominio.ngrok-free.app/ws/detection
```

## 📚 Recursos

- [Ngrok Documentation](https://ngrok.com/docs)
- [Bypass Interstitial](https://stackoverflow.com/questions/73017353/how-to-bypass-ngrok-browser-warning)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

## ✨ Resumo

✅ **A página de testes já tem o bypass implementado**
- Basta usar a URL do ngrok no campo "Backend URL"
- Os headers são adicionados automaticamente
- Funciona para todos os endpoints REST
- WebSocket converte automaticamente para wss://

🔧 **Para usar em outros lugares:**
```typescript
headers: {
  'ngrok-skip-browser-warning': 'true',
  'User-Agent': 'MyApp/1.0',
}
```

💡 **Melhor prática:**
- Use **localhost** para desenvolvimento
- Use **ngrok/cloudflare** para demos e testes externos
- Use **servidor próprio** para produção
