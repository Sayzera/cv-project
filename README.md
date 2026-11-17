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
