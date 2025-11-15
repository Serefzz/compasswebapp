class Compass {
    constructor() {
        this.compassRose = document.getElementById('compassRose');
        this.degreeValue = document.getElementById('degreeValue');
        this.directionText = document.getElementById('directionText');
        this.latitudeEl = document.getElementById('latitude');
        this.longitudeEl = document.getElementById('longitude');
        this.permissionMessage = document.getElementById('permissionMessage');
        this.permissionButton = document.getElementById('permissionButton');
        
        this.currentHeading = 0;
        this.smoothHeading = 0;
        
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
        }
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
        
        window.addEventListener('deviceorientation', (event) => {
            this.handleOrientation(event);
        });
    }
    
    handleOrientation(event) {
        // alpha è l'orientamento rispetto al nord magnetico (0-360)
        if (event.alpha !== null) {
            this.currentHeading = event.alpha;
            
            // Smoothing per un movimento più fluido
            this.smoothHeading = this.smoothHeading * 0.7 + this.currentHeading * 0.3;
            
            // Ruota la bussola nella direzione opposta per mantenere il nord fisso
            this.compassRose.style.transform = `rotate(${-this.smoothHeading}deg)`;
            
            // Aggiorna i gradi (arrotondati)
            const roundedHeading = Math.round(this.smoothHeading);
            this.degreeValue.textContent = `${roundedHeading}°`;
            
            // Aggiorna la direzione cardinale
            this.updateDirection(this.smoothHeading);
        }
    }
    
    updateDirection(heading) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(heading / 45) % 8;
        this.directionText.textContent = directions[index];
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

