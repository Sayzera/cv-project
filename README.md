# CV Dünyası

Karakterle gezilen, çok oyunculu 3B CV. Her CV bölümü bulvar boyunca bir kule-evdir; arsasına adım atınca bölüm açılır.

## Çalıştırma

```bash
npm install
cp .env.example .env   # PORT, NODE_ENV, MAX_PLAYERS
npm run dev            # nodemon: server.js veya .env değişince yeniden başlar
npm start              # normal çalıştırma
pm2 start ecosystem.config.js   # sunucuda PM2 ile
```

Ön yüz dosyaları (`js/`, `css/`, `index.html`) her istekte diskten okunur: değiştirince sayfayı yenilemen yeter, sunucuyu yeniden başlatmaya gerek yok.

Multiplayer için `server.js` gerekir (WebSocket). Dosyaları statik bir hostta (GitHub Pages vb.) yayınlarsan oyun tek oyunculu olarak çalışmaya devam eder.

## Sunucuda PM2 ile yayınlama

PM2 projeye bağımlılık olarak kurulu; sunucuda ayrıca global kurmana gerek yok.

```bash
git clone <repo> cv-world && cd cv-world      # ya da dosyaları kopyala
npm install --omit=dev
cp .env.example .env                           # PORT'u ayarla (örn. 3000)
npm run pm2:start                              # production modunda başlat
npx pm2 save && npx pm2 startup                # sunucu yeniden açılınca otomatik başlasın (çıkan komutu çalıştır)
```

| Komut | İşlev |
| --- | --- |
| `npm run pm2:status` | Durum |
| `npm run pm2:logs` | Canlı loglar (`logs/out.log`, `logs/error.log`) |
| `npm run pm2:restart` | Güncellemeden sonra yeniden yükle |
| `npm run pm2:stop` / `pm2:delete` | Durdur / kaldır |

Notlar:
- Multiplayer durumu bellekte tutulur, bu yüzden tek süreç (`instances: 1`) çalışır; cluster moduna alma.
- Nginx gibi bir reverse proxy arkasındaysan WebSocket için `/ws` yolunda `Upgrade` başlıklarını ilet:
  ```nginx
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
  ```
- HTTPS'te istemci otomatik olarak `wss://` kullanır.

## CV'ni düzenle

Sadece `js/cv-data.js` dosyasını düzenle: isim, unvan ve bölümler (başlık, ikon, renk, kat sayısı, metin, maddeler, etiketler, linkler).

## Kontroller

| Tuş | İşlev |
| --- | --- |
| WASD / oklar | Yürü (kameraya göre) |
| Shift | Koş |
| 1 / ⚡ | Hızlı koşu (varsayılan açık) |
| Space | Zıpla |
| E | Kapıda: bölümü büyük oku |
| Enter | Sohbet |
| Fare sürükle / tekerlek | Kamera döndür / yakınlaş |
| Dokunmatik | Parmak joystick, dokun: zıpla |

## Dosyalar

- `index.html`, `css/style.css`: arayüz
- `js/world.js`: dünya, karakter, multiplayer istemcisi
- `js/cv-data.js`: CV içeriği
- `server.js`: statik dosyalar + WebSocket relay (`/ws`)
- `models/`: karakter ve çevre modelleri (lisanslar `models/LICENSE.txt`)
