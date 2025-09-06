# Oto Parça Panel - Python Scraper Bot

Bu Python uygulaması, Oto Parça Panel web uygulaması için tedarikçi fiyat ve stok bilgilerini toplayan GUI tabanlı bir scraper bot'udur.

## Özellikler

- **GUI Arayüz**: Tkinter tabanlı kullanıcı dostu arayüz
- **Real-time İzleme**: Anlık işlem takibi ve log görüntüleme
- **API Entegrasyonu**: Web panel ile otomatik veri alışverişi
- **Çoklu Tedarikçi Desteği**: Dinamik, Başbuğ ve Doğuş tedarikçileri
- **Simüle Veri**: Demo amaçlı rastgele fiyat ve stok verileri
- **Hata Yönetimi**: Kapsamlı hata yakalama ve raporlama

## Kurulum

### Gereksinimler

- Python 3.8 veya üzeri
- pip (Python paket yöneticisi)

### Adımlar

1. **Depoyu klonlayın veya dosyaları indirin**
   ```bash
   cd scraper
   ```

2. **Gerekli paketleri yükleyin**
   ```bash
   pip install -r requirements.txt
   ```

3. **Uygulamayı çalıştırın**
   ```bash
   python main.py
   ```

## Kullanım

### Ana Arayüz

- **Bot Durumu**: Scraper bot'unun mevcut durumunu gösterir
- **API Bağlantısı**: Web panel ile bağlantı durumunu izler
- **Kontroller**: Bot'u başlatma/durdurma ve test işlemleri
- **Mevcut İstek**: Şu anda işlenen isteğin detayları
- **İşlem Logları**: Tüm işlemlerin detaylı kayıtları

### Bot Kontrolü

1. **Bot'u Başlat**: Scraper bot'unu aktif hale getirir
2. **Bot'u Durdur**: Scraper bot'unu devre dışı bırakır
3. **Test İsteği Gönder**: Demo amaçlı test isteği oluşturur
4. **Logları Temizle**: Log alanını temizler

### API Entegrasyonu

Bot, aşağıdaki endpoint'ler üzerinden web panel ile iletişim kurar:

- **GET** `/api/suppliers` - Tedarikçi listesi
- **POST** `/api/suppliers/update-single-price` - Tek ürün fiyat güncelleme

## Yapılandırma

### API Ayarları

`main.py` dosyasında API base URL'ini değiştirebilirsiniz:

```python
self.api_base_url = "http://localhost:3001/api"
```

### Simülasyon Ayarları

Demo modunda aşağıdaki değerler rastgele üretilir:

- **Fiyat**: 50-500 TL arası
- **Stok**: 0-100 adet arası
- **İşlem Süresi**: 1-3 saniye arası

## Geliştirme

### Gerçek Scraper Entegrasyonu

Üretim ortamında, `process_scraper_request` fonksiyonunu gerçek scraping logic'i ile değiştirin:

```python
def process_scraper_request(self, request_data):
    # Gerçek scraping logic'i buraya
    # Örnek: Selenium, BeautifulSoup, vs.
    pass
```

### Yeni Tedarikçi Ekleme

1. `suppliers` listesine yeni tedarikçi adını ekleyin
2. İlgili scraping logic'ini implement edin
3. GUI'de gerekli güncellemeleri yapın

### Log Sistemi

Log seviyeleri:
- **INFO**: Genel bilgi mesajları
- **SUCCESS**: Başarılı işlemler
- **WARNING**: Uyarı mesajları
- **ERROR**: Hata mesajları

## Sorun Giderme

### Yaygın Sorunlar

1. **API Bağlantı Hatası**
   - Web panel'in çalıştığından emin olun
   - Port numarasını kontrol edin (varsayılan: 3001)
   - Firewall ayarlarını kontrol edin

2. **GUI Açılmıyor**
   - Python'un tkinter desteği olduğundan emin olun
   - Sistem GUI kütüphanelerini kontrol edin

3. **İstek İşlenmiyor**
   - Bot'un başlatıldığından emin olun
   - Log mesajlarını kontrol edin
   - API endpoint'lerinin doğru olduğunu kontrol edin

### Debug Modu

Detaylı log çıktısı için Python'u verbose modda çalıştırın:

```bash
python -v main.py
```

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## İletişim

Sorularınız için lütfen proje sahibi ile iletişime geçin.