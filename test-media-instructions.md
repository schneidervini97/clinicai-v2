# 🧪 Instruções para Teste das Otimizações de Mídia

## ✅ Correções Implementadas

### 1. **Rota de Compatibilidade Criada**
- ✅ `/api/whatsapp/evolution` agora redireciona para `/api/webhooks/evolution`
- ✅ Resolve os erros 404 dos webhooks

### 2. **Evolution Service Atualizado**
- ✅ Endpoint de restart corrigido (POST ao invés de PUT)
- ✅ Método `configureWebhook()` adicionado para configurar webhook automaticamente

### 3. **Interface de Webhook**
- ✅ Botão "Reconfigurar Webhook" adicionado na página de configurações
- ✅ API endpoint `/api/whatsapp/webhook` para atualizar webhook existente

## 🧪 Como Testar o Sistema Completo

### Passo 1: Reconfigurar Webhook
1. Acesse `/dashboard/configuracoes/whatsapp`
2. Clique em **"Reconfigurar Webhook"** para atualizar a URL
3. Verifique no console se não há mais erros 404

### Passo 2: Testar Webhooks
1. Envie uma mensagem de texto do WhatsApp para o número da clínica
2. Verifique se aparece no chat sem erros 404 no console
3. Confirme que a mensagem é salva no banco com os campos corretos

### Passo 3: Testar Otimizações de Mídia

#### 📸 **Teste de Imagem:**
1. Envie uma **imagem com legenda** pelo WhatsApp
2. Verificar se:
   - ✅ Thumbnail aparece instantaneamente (base64)
   - ✅ Imagem completa carrega depois
   - ✅ Tamanho do arquivo é exibido (ex: "2.3 MB")
   - ✅ Legenda aparece abaixo da imagem
   - ✅ Clique na imagem abre modal em tela cheia
   - ✅ Aspect ratio correto

#### 🎥 **Teste de Vídeo:**
1. Envie um **vídeo com legenda** pelo WhatsApp
2. Verificar se:
   - ✅ Thumbnail do vídeo com botão play
   - ✅ Duração exibida (ex: "0:45")
   - ✅ Tamanho do arquivo exibido
   - ✅ Clique no play abre modal com player HTML5
   - ✅ Legenda aparece abaixo

#### 🎵 **Teste de Áudio:**
1. Envie um **áudio normal** (não mensagem de voz)
2. Envie uma **mensagem de voz** (PTT)
3. Verificar se:
   - ✅ Ícone diferente (🎵 para áudio, 🎤 para voz)
   - ✅ Waveform visual aparece (barrinhas)
   - ✅ Controles HTML5 funcionam
   - ✅ Duração exibida (ex: "0:23")
   - ✅ Tamanho exibido
   - ✅ Texto correto: "Mensagem de voz" vs "Áudio"

#### 📄 **Teste de Documento:**
1. Envie um **PDF ou documento**
2. Verificar se:
   - ✅ Ícone de documento
   - ✅ Nome do arquivo exibido
   - ✅ Tamanho exibido
   - ✅ Botão de download funciona
   - ✅ Legenda aparece se fornecida

#### 🎨 **Teste de Sticker:**
1. Envie um **sticker/figurinha**
2. Verificar se:
   - ✅ Sticker é exibido em tamanho correto (96px)
   - ✅ Não quebra o layout

#### 📍 **Teste de Localização:**
1. Compartilhe uma **localização**
2. Verificar se:
   - ✅ Ícone de mapa
   - ✅ Texto "📍 Localização"
   - ✅ Endereço exibido se disponível

## 🔧 Debug e Monitoramento

### Console do Navegador:
```javascript
// Verificar se não há erros 404:
// ✅ Esperado: Sem "POST /api/whatsapp/evolution 404"
// ✅ Esperado: "Message saved successfully" nos logs

// Verificar metadados no banco:
// ✅ Campos preenchidos: media_size, media_width, media_height, etc.
```

### Banco de Dados:
```sql
-- Verificar se os campos de mídia estão sendo preenchidos
SELECT 
  message_type,
  media_mime_type,
  media_size,
  media_width,
  media_height,
  media_duration,
  is_voice_note,
  LENGTH(media_thumbnail) as thumbnail_size,
  LENGTH(media_waveform) as waveform_size
FROM messages 
WHERE message_type != 'text'
ORDER BY created_at DESC 
LIMIT 10;
```

## 📊 Resultados Esperados

### Performance:
- ⚡ **Carregamento instantâneo** de thumbnails
- ⚡ **Sem travamento** do browser com mídias grandes
- ⚡ **UI responsiva** durante o carregamento

### UX:
- 🎯 **Informações contextuais** (tamanho, duração)
- 🎯 **Visualizações nativas** (waveform, aspect ratio)
- 🎯 **Modais funcionais** para imagem/vídeo

### Dados:
- 💾 **Metadados completos** salvos no banco
- 💾 **Thumbnails base64** para carregamento rápido
- 💾 **Waveforms** para visualização de áudio

## 🚨 Problemas Comuns

1. **Thumbnail não aparece**: Verificar se `media_thumbnail` está sendo salvo
2. **Waveform não funciona**: Verificar se `media_waveform` contém dados base64
3. **Modal não abre**: Verificar se não há erros JavaScript no console
4. **Tamanho errado**: Verificar se `formatFileSize()` está funcionando

## ✅ Critérios de Sucesso

- [ ] Webhooks funcionam sem erro 404
- [ ] Mensagens de texto são salvas e exibidas
- [ ] Imagens carregam com thumbnail primeiro
- [ ] Vídeos têm preview com botão play
- [ ] Áudios mostram waveform
- [ ] Documentos têm botão de download
- [ ] Tamanhos e durações são exibidos
- [ ] Modais de imagem/vídeo funcionam
- [ ] Performance é fluida

**Se todos os critérios forem atendidos, as otimizações de mídia estão funcionando perfeitamente! 🎉**