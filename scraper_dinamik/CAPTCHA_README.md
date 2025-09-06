# Dinamik Scraper CAPTCHA Çözümü

## Genel Bakış

Dinamik tedarikçisinin web sitesi bot koruması (CAPTCHA) kullanmaktadır. Bu çözüm, CAPTCHA algılandığında scraper'ın işlemi duraklattığı ve kullanıcı müdahalesi beklediği kapsamlı bir sistem sağlar.

## Özellikler

### 1. Otomatik CAPTCHA Algılama
- Web sayfasında güvenlik doğrulaması modal'ı algılanır
- CAPTCHA resmi URL'si otomatik olarak tespit edilir
- İşlem otomatik olarak duraklattılır

### 2. GUI Arayüzü
- CAPTCHA algılandığında otomatik popup pencere açılır
- Kullanıcıya net talimatlar gösterilir
- Manuel kod girişi imkanı sağlanır
- Real-time durum güncellemeleri

### 3. Backend Entegrasyonu
- 2 dakika timeout süresi (CAPTCHA çözümü için)
- Özel error handling ve retry mekanizması
- CAPTCHA durumu için özel response kodları

### 4. Frontend Bildirimleri
- CAPTCHA gerektiğinde özel uyarı mesajları
- Kullanıcıya scraper GUI'yi kontrol etme talimatı
- Uzun süreli toast mesajları (10 saniye)

## Kullanım Senaryoları

### Senaryo 1: Otomatik CAPTCHA Çözümü
1. Scraper CAPTCHA algılar
2. GUI popup penceresi açılır
3. Kullanıcı tarayıcıda CAPTCHA kodunu girer
4. "Devam Et" butonuna tıklar
5. İşlem otomatik devam eder

### Senaryo 2: Manuel CAPTCHA Girişi
1. Scraper CAPTCHA algılar
2. GUI popup penceresi açılır
3. Kullanıcı popup'ta CAPTCHA kodunu yazar
4. "Manuel Kodu Gönder" butonuna tıklar
5. Kod otomatik olarak web sitesine gönderilir

### Senaryo 3: Timeout Durumu
1. CAPTCHA 2 dakika içinde çözülmezse
2. Backend timeout hatası döner
3. Frontend özel CAPTCHA uyarısı gösterir
4. Kullanıcı scraper GUI'yi kontrol eder

## Teknik Detaylar

### Python Scraper (main.py)
```python
# CAPTCHA algılama
def check_for_captcha(self):
    # Ant Design modal kontrolü
    # Güvenlik doğrulaması başlığı kontrolü
    # CAPTCHA resmi URL'si çıkarma

# CAPTCHA çözümü bekleme
def wait_for_captcha_solution(self):
    # GUI popup gösterme
    # Kullanıcı müdahalesi bekleme
    # Çözüm onayı kontrolü
```

### Backend API (suppliers.controller.ts)
```typescript
// Uzatılmış timeout
timeout: 120000, // 2 dakika

// CAPTCHA error handling
if (error.code === 'ECONNABORTED') {
  // Özel CAPTCHA timeout response
  requiresManualIntervention: true
}
```

### Frontend (page.tsx)
```typescript
// CAPTCHA durumu kontrolü
if (result.requiresManualIntervention || 
    result.message?.includes('CAPTCHA')) {
  // Özel CAPTCHA uyarısı
  toast.warning('CAPTCHA gerekiyor!');
}
```

## Durum Göstergeleri

### Ana GUI'de CAPTCHA Durumu
- **CAPTCHA: Hazır** (Yeşil) - Normal durum
- **CAPTCHA: Bekleniyor ⚠️** (Turuncu) - CAPTCHA algılandı
- **CAPTCHA: Çözülüyor 🔄** (Mavi) - Kod gönderiliyor
- **CAPTCHA: Çözüldü ✅** (Yeşil) - Başarıyla çözüldü

### Frontend Toast Mesajları
- **Warning**: "CAPTCHA gerekiyor! Scraper GUI'den müdahale edin"
- **Info**: "CAPTCHA müdahalesi gerekiyor! Scraper GUI'yi kontrol edin"
- **Duration**: 10 saniye (normal mesajlardan daha uzun)

## Güvenlik Özellikleri

1. **Otomatik Reset**: CAPTCHA çözümünden 5 saniye sonra durum sıfırlanır
2. **Modal Window**: CAPTCHA popup'ı modal olarak açılır (diğer işlemleri engeller)
3. **Thread Safety**: Tüm CAPTCHA işlemleri thread-safe şekilde yapılır
4. **Error Recovery**: CAPTCHA başarısız olursa tekrar deneme imkanı

## Sorun Giderme

### CAPTCHA Algılanmıyor
- Tarayıcı güncel olduğundan emin olun
- Web sayfası tam yüklenene kadar bekleyin
- Console loglarını kontrol edin

### CAPTCHA Çözülmüyor
- Kodu doğru girdiğinizden emin olun
- Büyük/küçük harf duyarlılığına dikkat edin
- Gerekirse sayfayı yenileyin

### Timeout Hataları
- Scraper GUI'nin açık olduğundan emin olun
- CAPTCHA popup'ının görünür olduğunu kontrol edin
- İnternet bağlantınızı kontrol edin

## Gelecek Geliştirmeler

1. **OCR Entegrasyonu**: Otomatik CAPTCHA okuma
2. **Ses CAPTCHA**: Ses tabanlı CAPTCHA desteği
3. **Batch Processing**: Toplu CAPTCHA çözümü
4. **Analytics**: CAPTCHA sıklığı ve başarı oranları

## Notlar

- CAPTCHA çözümü tamamen manuel bir süreçtir
- Sistem güvenlik önlemlerini atlamaya çalışmaz
- Sadece kullanıcı müdahalesini kolaylaştırır
- Web sitesinin terms of service'ine uygun kullanım gereklidir