#!/bin/bash

# .command dosyaları varsayılan olarak kullanıcı ana dizininde başlar.
# Betiğin bulunduğu gerçek klasöre geçiş yapıyoruz:
cd "$(dirname "$0")"
PROJ_DIR=$(pwd)

clear
echo "=========================================================="
echo "      Premiere Pro Türkçe Altyazı Eklentisi Yükleyici"
echo "=========================================================="
echo "Bu yükleyici, eklentiyi bilgisayarınıza kuracak ve Adobe"
echo "geliştirici modunu aktif hale getirecektir."
echo "----------------------------------------------------------"

# 1. Node.js ve NPM Kontrolü
echo "1. Sistemde Node.js ve NPM kontrol ediliyor..."
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "❌ HATA: Sisteminizde Node.js veya NPM kurulu bulunamadı!"
    echo "Eklentinin çalışması için Node.js kurmanız gerekmektedir."
    echo "Web tarayıcınız Node.js indirme sayfasına yönlendiriliyor..."
    open "https://nodejs.org/"
    echo ""
    echo "Lütfen önce Node.js kurulumunu tamamlayın ve bu dosyayı"
    echo "yeniden çalıştırın."
    echo "=========================================================="
    read -p "Çıkmak için [Enter] tuşuna basın..."
    exit 1
fi
echo "✔ Node.js Sürümü: $(node -v)"
echo "✔ NPM Sürümü: $(npm -v)"
echo ""

# 2. Bağımlılıkların Kurulması ve Derleme
echo "2. Proje bağımlılıkları kuruluyor (npm install)..."
npm install
echo "✔ Kütüphaneler başarıyla yüklendi!"
echo ""

echo "3. Arayüz Premiere Pro için derleniyor (npm run build)..."
npm run build
echo "✔ Arayüz başarıyla derlendi!"
echo ""

# 3. Adobe PlayerDebugMode Ayarları
echo "4. Adobe CEP geliştirici modu (imzasız eklenti izni) aktif ediliyor..."
for v in {9..16}; do
  defaults write com.adobe.CSXS.$v PlayerDebugMode 1 2>/dev/null || true
done
killall cfprefsd 2>/dev/null || true
echo "✔ Adobe Geliştirici Modu aktif edildi!"
echo ""

# 4. CEPextensions Klasörüne Kayıt
echo "5. Eklenti Adobe CEP Extensions klasörüne bağlanıyor..."
EXTENSION_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
mkdir -p "$EXTENSION_DIR"

TARGET_LINK="$EXTENSION_DIR/premiere-pro-turkce-altyazi"
if [ -e "$TARGET_LINK" ] || [ -L "$TARGET_LINK" ]; then
  rm -rf "$TARGET_LINK"
fi

ln -s "$PROJ_DIR" "$TARGET_LINK"
echo "✔ Eklenti başarıyla kaydedildi: $TARGET_LINK"
echo ""

# 5. .env Yapılandırması ve API Key Girişi
echo "6. Yapılandırma dosyaları hazırlanıyor..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        echo "GEMINI_API_KEY=\"\"" > .env
        echo "APP_URL=\"http://localhost:3000\"" >> .env
    fi
fi

# Kullanıcıdan API key isteyelim
echo "Lütfen Gemini API anahtarınızı (GEMINI_API_KEY) girin."
echo "(Boş bırakırsanız mevcut anahtar korunur veya daha sonra .env dosyasından el ile düzenleyebilirsiniz):"
read -r USER_API_KEY

if [ -n "$USER_API_KEY" ]; then
    # .env dosyasını yeni API key ile güncelle
    echo "GEMINI_API_KEY=\"$USER_API_KEY\"" > .env
    echo "APP_URL=\"http://localhost:3000\"" >> .env
    echo "✔ API Anahtarınız kaydedildi!"
else
    echo "ℹ API Anahtarı girişi atlandı. (Mevcut .env dosyası korundu)."
fi
echo ""

# 6. Terminal Kısayolu Tanımlama (altyazi)
echo "7. Terminal kısayolu (altyazi) kaydediliyor..."
# ~/.zshrc güncelle
if [ -f "$HOME/.zshrc" ]; then
    if ! grep -q "alias altyazi=" "$HOME/.zshrc"; then
        echo "" >> "$HOME/.zshrc"
        echo "# Premiere Pro Türkçe Altyazı Eklentisi Kısayolu" >> "$HOME/.zshrc"
        echo "alias altyazi=\"cd \\\"$PROJ_DIR\\\" && npm run dev\"" >> "$HOME/.zshrc"
    fi
else
    echo "# Premiere Pro Türkçe Altyazı Eklentisi Kısayolu" > "$HOME/.zshrc"
    echo "alias altyazi=\"cd \\\"$PROJ_DIR\\\" && npm run dev\"" >> "$HOME/.zshrc"
fi

# ~/.zprofile güncelle
if [ -f "$HOME/.zprofile" ]; then
    if ! grep -q "alias altyazi=" "$HOME/.zprofile"; then
        echo "" >> "$HOME/.zprofile"
        echo "# Premiere Pro Türkçe Altyazı Eklentisi Kısayolu" >> "$HOME/.zprofile"
        echo "alias altyazi=\"cd \\\"$PROJ_DIR\\\" && npm run dev\"" >> "$HOME/.zprofile"
    fi
else
    echo "# Premiere Pro Türkçe Altyazı Eklentisi Kısayolu" > "$HOME/.zprofile"
    echo "alias altyazi=\"cd \\\"$PROJ_DIR\\\" && npm run dev\"" >> "$HOME/.zprofile"
fi

echo "✔ 'altyazi' kısayolu terminale eklendi!"
echo ""

echo "=========================================================="
echo "🎉 TEBRİKLER! KURULUM BAŞARIYLA TAMAMLANDI 🎉"
echo "=========================================================="
echo "Eklentiyi kullanmaya başlamak için:"
echo "1. Yeni bir terminal açın ve şunu yazıp Enter'a basın: altyazi"
echo "2. Premiere Pro'yu açın."
echo "3. Pencere > Eklentiler > Türkçe Altyazı Üretici menüsünü açın."
echo "----------------------------------------------------------"
read -p "Çıkmak için [Enter] tuşuna basın..."
exit 0
