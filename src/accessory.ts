import { API, Logging, AccessoryConfig, Service, Characteristic, AccessoryPlugin } from 'homebridge';
import { BlindController, BlindConfig } from './blind-controller';

export class SmartBlindsAccessory implements AccessoryPlugin {
  private service: Service;
  private characteristic: Characteristic;
  private blindConfig: BlindConfig;
  private blindController: BlindController;

  constructor(
    private readonly api: API,
    private readonly log: Logging,
    private readonly config: AccessoryConfig
  ) {
    this.blindConfig = config as unknown as BlindConfig;
    
    // Créer le contrôleur de volets pour cet accessoire
    this.blindController = new BlindController(
      new (require('./mqtt-manager').MQTTManager)(this.config.mqtt, this.log),
      this.log,
      { blinds: [this.blindConfig] }
    );
    
    // Initialiser le volet dans le contrôleur
    this.blindController.initializeBlind(this.blindConfig.name, this.blindConfig);

    // Créer le service WindowCovering
    this.service = new this.api.hap.Service.WindowCovering(this.blindConfig.name);

    // Obtenir la caractéristique TargetPosition
    this.characteristic = this.service.getCharacteristic(this.api.hap.Characteristic.TargetPosition);

    // Configurer les gestionnaires d'événements
    this.setupEventHandlers();

    this.log.info(`Accessoire volet créé: ${this.blindConfig.name}`);
  }

  private setupEventHandlers(): void {
    // Gérer les changements de position cible
    this.characteristic.on('set', async (value, callback) => {
      try {
        const targetPosition = value as number;
        const currentState = this.blindController.getBlindState(this.blindConfig.name);
        
        if (!currentState) {
          callback(new Error('État du volet non trouvé'));
          return;
        }

        this.log.info(`${this.blindConfig.name}: Position cible ${targetPosition}%`);

        // Déterminer la direction
        if (targetPosition > currentState.position) {
          // Monter le volet
          await this.blindController.moveBlind(this.blindConfig.name, 'up', this.blindConfig);
        } else if (targetPosition < currentState.position) {
          // Descendre le volet
          await this.blindController.moveBlind(this.blindConfig.name, 'down', this.blindConfig);
        }

        callback(null);
      } catch (error) {
        this.log.error(`Erreur lors du mouvement du volet ${this.blindConfig.name}:`, error);
        callback(error as Error);
      }
    });

    // Gérer les requêtes de position actuelle
    this.service.getCharacteristic(this.api.hap.Characteristic.CurrentPosition)
      .on('get', (callback) => {
        const state = this.blindController.getBlindState(this.blindConfig.name);
        if (state) {
          callback(null, state.position);
        } else {
          callback(new Error('État du volet non trouvé'));
        }
      });

    // Gérer les requêtes de position cible
    this.characteristic.on('get', (callback) => {
      const state = this.blindController.getBlindState(this.blindConfig.name);
      if (state) {
        callback(null, state.position);
      } else {
        callback(new Error('État du volet non trouvé'));
      }
    });

    // Gérer l'état de position (ouvert/fermé)
    this.service.getCharacteristic(this.api.hap.Characteristic.PositionState)
      .on('get', (callback) => {
        const state = this.blindController.getBlindState(this.blindConfig.name);
        if (state) {
          if (state.isMoving) {
            if (state.lastCommand === 'up') {
              callback(null, this.api.hap.Characteristic.PositionState.INCREASING);
            } else if (state.lastCommand === 'down') {
              callback(null, this.api.hap.Characteristic.PositionState.DECREASING);
            } else {
              callback(null, this.api.hap.Characteristic.PositionState.STOPPED);
            }
          } else {
            callback(null, this.api.hap.Characteristic.PositionState.STOPPED);
          }
        } else {
          callback(new Error('État du volet non trouvé'));
        }
      });

    // Mettre à jour l'état toutes les secondes pendant le mouvement
    setInterval(() => {
      const state = this.blindController.getBlindState(this.blindConfig.name);
      if (state && state.isMoving) {
        this.service.updateCharacteristic(
          this.api.hap.Characteristic.CurrentPosition,
          state.position
        );
        
        this.service.updateCharacteristic(
          this.api.hap.Characteristic.TargetPosition,
          state.position
        );
      }
    }, 1000);
  }

  // Méthode pour obtenir le service (appelée par Homebridge)
  getServices(): Service[] {
    return [this.service];
  }

  // Méthode pour mettre à jour la position du volet
  public updatePosition(position: number): void {
    this.blindController.setBlindPosition(this.blindConfig.name, position);
    
    this.service.updateCharacteristic(
      this.api.hap.Characteristic.CurrentPosition,
      position
    );
    
    this.service.updateCharacteristic(
      this.api.hap.Characteristic.TargetPosition,
      position
    );
  }
}
