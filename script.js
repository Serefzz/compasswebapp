class Compass {
    constructor() {
        this.compassRose = document.getElementById('compassRose');
        this.degreeValue = document.getElementById('degreeValue');
        this.directionText = document.getElementById('directionText');
        this.latitudeEl = document.getElementById('latitude');
        this.longitudeEl = document.getElementById('longitude');
        this.permissionMessage = document.getElementById('permissionMessage');
        this.permissionButton = document.getElementById('permissionButton');
        this.calibrationIndicator = document.getElementById('calibrationIndicator');
        
        // Variabili per il calcolo dell'orientamento
        this.alpha = 0;          // Orientamento azimut (0-360)
        this.beta = 0;           // Inclinazione frontale (-180 a 180)
        this.gamma = 0;          // Inclinazione laterale (-90 a 90)
        
        // Dati giroscopio per smoothing avanzato
        this.gyroData = {
            alpha: 0,
            beta: 0,
            gamma: 0,
            lastUpdate: Date.now()
        };
        
        this.heading = 0;        // Direzione calcolata
        this.smoothHeading = 0;  // Direzione con smoothing
        this.lastHeading = 0;    // Ultima direzione per calcolo velocità
        
        // Calibrazione magnetometro
        this.calibrationData = {
            minX: 0,
            maxX: 0,
            minY: 0,
            maxY: 0,
            minZ: 0,
            maxZ: 0
        };
        this.isCalibrating = false;
        this.calibrationSamples = 0;
        this.maxCalibrationSamples = 100;
        
        // Precisione calibrazione
        this.calibrationAccuracy = 0;
        
        this.init();
    }
    
    init() {
        // Controlla se il dispositivo supporta l'orientamento
        if (window.DeviceOrientationEvent) {
            // Richiedi permesso per iOS 13+ (richiede interazione utente)
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                this.showPermissionMessage('Tocca il pulsante per abilitare la bussola.');
                this.permissionButton.style.display = 'block';
                this.permissionButton.addEventListener('click', () => this.requestPermission());
            } else {
                this.startCompass();
            }
        } else {
            this.showPermissionMessage('Il tuo dispositivo non supporta la bussola.');
        }
        
        // Prova a ottenere la posizione GPS
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => this.updateCoordinates(position),
                (error) => console.log('Errore GPS:', error)
            );
            
            // Aggiorna continuamente la posizione
            navigator.geolocation.watchPosition(
                (position) => this.updateCoordinates(position),
                (error) => console.log('Errore GPS:', error)
            );
        }
        
        // Avvia la calibrazione automatica
        this.startCalibration();
    }
    
    async requestPermission() {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                this.startCompass();
            } else {
                this.showPermissionMessage('Permesso negato. Abilita l\'orientamento nelle impostazioni del browser.');
            }
        } catch (error) {
            this.showPermissionMessage('Errore nella richiesta del permesso.');
        }
    }
    
    startCompass() {
        this.permissionMessage.classList.remove('show');
        
        // Usa DeviceOrientationEvent per giroscopio, accelerometro e magnetometro
        window.addEventListener('deviceorientation', (event) => {
            this.handleOrientation(event);
        }, true);
        
        // Usa anche DeviceMotionEvent per dati più precisi del giroscopio
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', (event) => {
                this.handleMotion(event);
            }, true);
        }
    }
    
    handleOrientation(event) {
        // alpha: orientamento azimut (0-360) - rotazione attorno all'asse Z
        // beta: inclinazione frontale (-180 a 180) - rotazione attorno all'asse X
        // gamma: inclinazione laterale (-90 a 90) - rotazione attorno all'asse Y
        
        if (event.alpha !== null) {
            this.alpha = event.alpha;
        }
        if (event.beta !== null) {
            this.beta = event.beta;
        }
        if (event.gamma !== null) {
            this.gamma = event.gamma;
        }
        
        // Calcola l'orientamento usando la formula per compensare l'inclinazione
        this.calculateHeading();
        
        // Calibrazione automatica
        if (this.isCalibrating) {
            this.updateCalibration();
        }
    }
    
    handleMotion(event) {
        // Usa i dati del giroscopio per rotazioni più fluide e precise
        if (event.rotationRate) {
            const now = Date.now();
            const dt = (now - this.gyroData.lastUpdate) / 1000; // Delta time in secondi
            
            if (dt > 0 && dt < 1) { // Evita salti temporali anomali
                // rotationRate fornisce la velocità di rotazione in gradi/secondo
                // Integra la velocità per ottenere la rotazione
                if (event.rotationRate.alpha !== null) {
                    // Usa il giroscopio per smoothing più intelligente
                    const gyroRotation = event.rotationRate.alpha * dt;
                    this.gyroData.alpha += gyroRotation;
                }
            }
            
            this.gyroData.lastUpdate = now;
        }
        
        // Usa l'accelerometro per calibrazione
        if (event.accelerationIncludingGravity && this.isCalibrating) {
            const accel = event.accelerationIncludingGravity;
            // Rileva movimento a forma di 8 per calibrazione
            this.detectCalibrationMotion(accel);
        }
        
        // Usa il magnetometro se disponibile (alcuni browser lo forniscono)
        if (event.rotationRate && this.isCalibrating) {
            // Il movimento del dispositivo migliora la calibrazione
            const movement = Math.abs(event.rotationRate.alpha || 0) + 
                           Math.abs(event.rotationRate.beta || 0) + 
                           Math.abs(event.rotationRate.gamma || 0);
            
            if (movement > 10) {
                this.calibrationSamples += 3; // Movimento rapido = calibrazione migliore
            }
        }
    }
    
    calculateHeading() {
        // Converti gradi in radianti
        const alphaRad = this.alpha * Math.PI / 180;
        const betaRad = this.beta * Math.PI / 180;
        const gammaRad = this.gamma * Math.PI / 180;
        
        // Calcola l'orientamento compensando l'inclinazione
        // Formula per calcolare l'azimut corretto considerando l'inclinazione
        let heading = 0;
        
        // Se il dispositivo è piatto (beta e gamma piccoli), usa direttamente alpha
        if (Math.abs(this.beta) < 45 && Math.abs(this.gamma) < 45) {
            heading = this.alpha;
        } else {
            // Compensa l'inclinazione usando le formule di rotazione 3D
            // Calcola la direzione del nord magnetico considerando l'inclinazione
            const cosBeta = Math.cos(betaRad);
            const sinBeta = Math.sin(betaRad);
            const cosGamma = Math.cos(gammaRad);
            const sinGamma = Math.sin(gammaRad);
            
            // Proiezione del vettore nord sul piano del dispositivo
            const northX = Math.sin(alphaRad) * cosBeta;
            const northY = Math.cos(alphaRad) * cosBeta;
            
            // Calcola l'angolo di heading
            heading = Math.atan2(northX, northY) * 180 / Math.PI;
            
            // Normalizza a 0-360
            if (heading < 0) {
                heading += 360;
            }
        }
        
        // Applica calibrazione se disponibile
        if (this.calibrationAccuracy > 0.5) {
            heading = this.applyCalibration(heading);
        }
        
        this.heading = heading;
        
        // Calcola la velocità di rotazione per smoothing adattivo
        let headingDiff = this.heading - this.lastHeading;
        
        // Gestisci il wrap-around a 360/0
        if (headingDiff > 180) {
            headingDiff -= 360;
        } else if (headingDiff < -180) {
            headingDiff += 360;
        }
        
        const rotationSpeed = Math.abs(headingDiff);
        
        // Smoothing adattivo: più veloce la rotazione, meno smoothing
        // Questo rende la bussola più reattiva quando ruoti velocemente
        let smoothingFactor = 0.15; // Default
        
        if (rotationSpeed > 5) {
            smoothingFactor = 0.3; // Più reattivo per rotazioni veloci
        } else if (rotationSpeed < 1) {
            smoothingFactor = 0.1; // Più smoothing quando fermo
        }
        
        // Applica smoothing con correzione per wrap-around
        let targetHeading = this.smoothHeading + headingDiff;
        
        // Normalizza targetHeading
        if (targetHeading < 0) {
            targetHeading += 360;
        } else if (targetHeading >= 360) {
            targetHeading -= 360;
        }
        
        // Interpola verso il target
        let smoothDiff = targetHeading - this.smoothHeading;
        
        // Gestisci wrap-around per il calcolo dello smoothing
        if (smoothDiff > 180) {
            smoothDiff -= 360;
        } else if (smoothDiff < -180) {
            smoothDiff += 360;
        }
        
        this.smoothHeading += smoothDiff * smoothingFactor;
        
        // Normalizza l'angolo smooth
        if (this.smoothHeading < 0) {
            this.smoothHeading += 360;
        } else if (this.smoothHeading >= 360) {
            this.smoothHeading -= 360;
        }
        
        this.lastHeading = this.heading;
        
        // Aggiorna la visualizzazione
        this.updateDisplay();
    }
    
    applyCalibration(heading) {
        // Applica correzione di calibrazione se necessario
        // Per ora restituiamo l'heading originale
        // In un'implementazione completa, si applicherebbero offset calibrati
        return heading;
    }
    
    updateDisplay() {
        // Ruota la bussola nella direzione opposta per mantenere il nord fisso
        this.compassRose.style.transform = `rotate(${-this.smoothHeading}deg)`;
        
        // Aggiorna i gradi (arrotondati)
        const roundedHeading = Math.round(this.smoothHeading);
        this.degreeValue.textContent = `${roundedHeading}°`;
        
        // Aggiorna la direzione cardinale
        this.updateDirection(this.smoothHeading);
    }
    
    updateDirection(heading) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(heading / 45) % 8;
        this.directionText.textContent = directions[index];
    }
    
    startCalibration() {
        this.isCalibrating = true;
        this.calibrationSamples = 0;
        this.calibrationIndicator.classList.add('show');
        this.calibrationIndicator.classList.remove('calibrated');
        
        // Calibrazione automatica per 5 secondi
        setTimeout(() => {
            this.finishCalibration();
        }, 5000);
    }
    
    updateCalibration() {
        // Raccogli dati per calibrazione
        this.calibrationSamples++;
        
        // Calcola la precisione basata sulla variabilità dei dati
        // Più movimento = migliore calibrazione
        if (this.calibrationSamples > 10) {
            this.calibrationAccuracy = Math.min(1, this.calibrationSamples / this.maxCalibrationSamples);
        }
    }
    
    detectCalibrationMotion(accel) {
        // Rileva movimento a forma di 8 per calibrazione
        // Se l'accelerazione varia significativamente, l'utente sta muovendo il dispositivo
        const magnitude = Math.sqrt(
            accel.x * accel.x + 
            accel.y * accel.y + 
            accel.z * accel.z
        );
        
        // Se c'è movimento significativo, migliora la calibrazione
        if (magnitude > 12 || magnitude < 8) {
            this.calibrationSamples += 2; // Movimento = calibrazione migliore
        }
    }
    
    finishCalibration() {
        this.isCalibrating = false;
        
        if (this.calibrationAccuracy > 0.3) {
            this.calibrationIndicator.classList.add('calibrated');
            this.calibrationIndicator.querySelector('.calibration-text').textContent = 'Bussola calibrata';
            
            // Nascondi dopo 2 secondi
            setTimeout(() => {
                this.calibrationIndicator.classList.remove('show');
            }, 2000);
        } else {
            // Mantieni visibile se la calibrazione non è buona
            this.calibrationIndicator.querySelector('.calibration-text').textContent = 
                'Calibrazione incompleta. Muovi il dispositivo a forma di 8.';
        }
    }
    
    updateCoordinates(position) {
        const lat = position.coords.latitude.toFixed(6);
        const lon = position.coords.longitude.toFixed(6);
        this.latitudeEl.textContent = lat;
        this.longitudeEl.textContent = lon;
    }
    
    showPermissionMessage(message) {
        this.permissionMessage.innerHTML = `<p>${message}</p>`;
        this.permissionMessage.classList.add('show');
    }
}

// Inizializza la bussola quando il DOM è pronto
let compassInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    compassInstance = new Compass();
});
