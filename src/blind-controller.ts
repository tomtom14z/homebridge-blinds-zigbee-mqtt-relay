import { Logging } from 'homebridge';
import { MQTTManager } from './mqtt-manager';

export interface BlindConfig {
  name: string;
  relayName: string;
  relayType: 'eweLink-2CH' | 'mhcozy-4CH';
  channels: {
    up: string;
    down: string;
  };
  mqttTopic: string;
  openDuration: number; // en secondes
  queueDelay: number; // délai entre commandes en secondes
}

export interface BlindState {
  position: number; // 0-100
  isMoving: boolean;
  lastCommand: 'up' | 'down' | null;
  lastCommandTime: number;
}

export class BlindController {
  private blinds: Map<string, BlindState> = new Map();
  private commandQueue: Array<{ blindName: string; command: 'up' | 'down'; timestamp: number }> = [];
  private isProcessingQueue = false;
  private relayStates: Map<string, { [key: string]: boolean }> = new Map();

  constructor(
    private mqttManager: MQTTManager,
    private log: Logging,
    private config: any
  ) {
    this.initializeRelayMonitoring();
  }

  private initializeRelayMonitoring(): void {
    // Surveiller l'état des relais pour détecter les doubles impulsions
    this.config.blinds.forEach((blind: BlindConfig) => {
      const stateTopic = `zigbee2mqtt/${blind.relayName}`;
      this.mqttManager.subscribe(stateTopic, (topic, message) => {
        this.handleRelayStateUpdate(blind.relayName, message.toString());
      });
    });
  }

  private handleRelayStateUpdate(relayName: string, message: string): void {
    try {
      const state = JSON.parse(message);
      const currentStates = this.relayStates.get(relayName) || {};
      
      // Détecter les changements d'état
      Object.keys(state).forEach(channel => {
        if (channel.startsWith('state_') && state[channel] === 'ON') {
          const channelName = channel.replace('state_', '');
          currentStates[channelName] = true;
          
          // Détecter les doubles impulsions
          this.detectDoubleImpulse(relayName, channelName);
        }
      });
      
      this.relayStates.set(relayName, currentStates);
    } catch (error) {
      this.log.error(`Erreur parsing état relais ${relayName}:`, error);
    }
  }

  private detectDoubleImpulse(relayName: string, channelName: string): void {
    // Logique pour détecter les doubles impulsions accidentelles
    // et envoyer une commande de correction si nécessaire
    this.log.debug(`Impulsion détectée sur ${relayName} canal ${channelName}`);
  }

  public initializeBlind(blindName: string, config: BlindConfig): void {
    this.blinds.set(blindName, {
      position: 0,
      isMoving: false,
      lastCommand: null,
      lastCommandTime: 0
    });
  }

  public async moveBlind(blindName: string, command: 'up' | 'down', config: BlindConfig): Promise<void> {
    const blind = this.blinds.get(blindName);
    if (!blind) {
      this.log.error(`Volet ${blindName} non trouvé`);
      return;
    }

    // Logique intelligente selon l'état du volet
    let actualCommand = command;
    
    if (command === 'up' && blind.position === 0) {
      // Si le volet est complètement fermé, commencer par DOWN puis UP
      actualCommand = 'down';
      this.log.info(`Volet ${blindName} fermé, commande DOWN puis UP`);
    } else if (command === 'down' && blind.position === 100) {
      // Si le volet est complètement ouvert, commencer par UP puis DOWN
      actualCommand = 'up';
      this.log.info(`Volet ${blindName} ouvert, commande UP puis DOWN`);
    }

    // Ajouter à la file d'attente avec délai
    this.addToQueue(blindName, actualCommand, config);
    
    // Si c'était une commande spéciale, ajouter la commande finale
    if (actualCommand !== command) {
      setTimeout(() => {
        this.addToQueue(blindName, command, config);
      }, 1000); // 1 seconde entre les commandes
    }
  }

  private addToQueue(blindName: string, command: 'up' | 'down', config: BlindConfig): void {
    const queueItem = {
      blindName,
      command,
      timestamp: Date.now()
    };

    this.commandQueue.push(queueItem);
    this.log.debug(`Commande ajoutée à la file: ${blindName} ${command}`);

    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.commandQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.commandQueue.length > 0) {
      const item = this.commandQueue.shift();
      if (!item) continue;

      const blind = this.blinds.get(item.blindName);
      if (!blind) continue;

      // Vérifier le délai depuis la dernière commande
      const timeSinceLastCommand = Date.now() - blind.lastCommandTime;
      if (timeSinceLastCommand < (this.config.globalQueueDelay || 2000)) {
        await this.delay(this.config.globalQueueDelay || 2000 - timeSinceLastCommand);
      }

      // Exécuter la commande
      await this.executeCommand(item.blindName, item.command, this.getBlindConfig(item.blindName));
      
      // Mettre à jour l'état du volet
      blind.lastCommand = item.command;
      blind.lastCommandTime = Date.now();
      blind.isMoving = true;

      // Attendre la durée d'ouverture/fermeture
      const config = this.getBlindConfig(item.blindName);
      if (config) {
        await this.delay(config.openDuration * 1000);
        blind.isMoving = false;
        
        // Mettre à jour la position
        if (item.command === 'up') {
          blind.position = Math.min(100, blind.position + 25);
        } else {
          blind.position = Math.max(0, blind.position - 25);
        }
      }

      // Délai entre les commandes
      if (this.commandQueue.length > 0) {
        await this.delay(this.config.globalQueueDelay || 2000);
      }
    }

    this.isProcessingQueue = false;
  }

  private async executeCommand(blindName: string, command: 'up' | 'down', config: BlindConfig): Promise<void> {
    if (!config) {
      this.log.error(`Configuration non trouvée pour ${blindName}`);
      return;
    }

    const channel = command === 'up' ? config.channels.up : config.channels.down;
    const topic = `${config.mqttTopic}/set`;
    const payload = JSON.stringify({ [`state_${channel}`]: 'ON' });

    this.log.info(`Exécution commande: ${blindName} ${command} -> ${topic} ${payload}`);
    
    return new Promise((resolve) => {
      this.mqttManager.publish(topic, payload, resolve);
    });
  }

  private getBlindConfig(blindName: string): BlindConfig | undefined {
    return this.config.blinds.find((b: BlindConfig) => b.name === blindName);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getBlindState(blindName: string): BlindState | undefined {
    return this.blinds.get(blindName);
  }

  public setBlindPosition(blindName: string, position: number): void {
    const blind = this.blinds.get(blindName);
    if (blind) {
      blind.position = Math.max(0, Math.min(100, position));
    }
  }
}
