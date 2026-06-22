==========================================================
 🎬 Premiere Pro Türkçe Altyazı Eklentisi Kurulum Kılavuzu
==========================================================

Bu eklenti, Google AI Studio Gemini API'sini kullanarak Premiere Pro
içinde otomatik, TDK uyumlu ve ses kanalına duyarlı Türkçe altyazı
üretmenizi sağlar.

----------------------------------------------------------
📦 Gereksinimler (Kurulum Öncesi Yapılması Gereken Tek Şey):
----------------------------------------------------------
1. Bilgisayarınızda Node.js kurulu olmalıdır.
   Eğer kurulu değilse, şu adresten indirip kurun:
   👉 https://nodejs.org/ (LTS - Kararlı sürümü indirin)

----------------------------------------------------------
🚀 Tek Tıkla Kurulum:
----------------------------------------------------------
1. Bu klasörün içindeki "kurulum.command" dosyasına ÇİFT TIKLAYIN.
2. Terminal ekranı açılacaktır. Terminaldeki yönlendirmeleri izleyin.
3. Kurulum sırasında sizden "Gemini API Anahtarı" (GEMINI_API_KEY)
   germeniz istenecektir. API anahtarınızı yapıştırıp Enter'a basın.
   (API anahtarınız yoksa boş geçebilir ve daha sonra klasördeki
   gizli ".env" dosyasını açıp ekleyebilirsiniz).
4. Kurulum bittiğinde terminal "BAŞARIYLA TAMAMLANDI" uyarısı verecektir.

----------------------------------------------------------
💻 Çalıştırma ve Kullanım:
----------------------------------------------------------
1. Kurulum bittikten sonra yeni bir Terminal penceresi açın.
2. Sadece şu kelimeyi yazıp Enter'a basın:
   altyazi
   (Bu komut arka planda Gemini API sunucusunu başlatır. Eklentiyi
   kullandığınız sürece bu terminal ekranının açık kalması gerekir).
3. Adobe Premiere Pro'yu açın.
4. Üst menüden sırasıyla şuraya gidin:
   Pencere > Eklentiler > Türkçe Altyazı Üretici
   (Window > Extensions > Türkçe Altyazı Üretici)
5. Paneliniz açılacaktır. Artık timeline'dan ses kanalı seçerek veya
   ses dosyası sürükleyerek deşifre işlemini başlatabilirsiniz!

----------------------------------------------------------
❓ Sorun Giderme (Troubleshooting):
----------------------------------------------------------
- "kurulum.command açılmıyor, izin hatası veriyor" diyorsa:
  Terminali açıp şu komutu yazıp Enter'a basın, ardından çift tıklayın:
  chmod +x "klasörün_yolu/kurulum.command"

- Eklenti panelinde "Sunucu Hatası" veya "Bağlantı Hatası" alıyorsanız:
  Terminalde "altyazi" komutunun çalışır durumda olduğundan ve hata
  vermediğinden emin olun.

==========================================================
