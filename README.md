# Bussola Web App

Una web app che funziona come l'app bussola per iPhone, con interfaccia moderna e design elegante.

## Caratteristiche

- 🧭 Bussola digitale con animazioni fluide
- 📍 Indicazione direzione cardinale (N, NE, E, SE, S, SW, W, NW)
- 📊 Visualizzazione gradi (0-360°)
- 🌍 Coordinate GPS (latitudine e longitudine)
- 📱 Design responsive ottimizzato per mobile
- 🎨 Interfaccia moderna con effetti glassmorphism

## Requisiti

- Browser moderno con supporto per `DeviceOrientationEvent`
- Dispositivo con sensore magnetometrico (bussola)
- HTTPS o localhost (richiesto per l'accesso ai sensori del dispositivo)

## Utilizzo

1. Apri `index.html` in un browser moderno
2. Su iOS 13+, verrà richiesto il permesso per l'orientamento del dispositivo
3. Su Android, assicurati di essere su HTTPS o localhost
4. La bussola si aggiornerà automaticamente in base all'orientamento del dispositivo

## Note

- Su iOS, l'app richiede il permesso esplicito per l'orientamento
- Per funzionare correttamente, l'app deve essere servita tramite HTTPS (o localhost per lo sviluppo)
- Il GPS richiede il permesso di geolocalizzazione del browser

## Sviluppo Locale

Per testare in locale, puoi usare un server HTTP semplice:

```bash
# Con Python 3
python -m http.server 8000

# Con Node.js (http-server)
npx http-server

# Con PHP
php -S localhost:8000
```

Poi apri `http://localhost:8000` nel browser.

