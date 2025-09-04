import * as mqtt from 'mqtt';
import { Logging } from 'homebridge';

export interface MQTTConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  clientId?: string;
}

export class MQTTManager {
  private client: mqtt.MqttClient | null = null;
  private isConnected = false;
  private messageQueue: Array<{ topic: string; payload: string; callback?: () => void }> = [];
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private config: MQTTConfig, private log: Logging) {
    this.connect();
  }

  private connect(): void {
    const options: mqtt.IClientOptions = {
      clientId: this.config.clientId || `homebridge-smart-blinds-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    };

    if (this.config.username && this.config.password) {
      options.username = this.config.username;
      options.password = this.config.password;
    }

    const url = `mqtt://${this.config.host}:${this.config.port}`;
    this.log.info(`Connexion MQTT à ${url}`);

    this.client = mqtt.connect(url, options);

    this.client.on('connect', () => {
      this.log.info('Connecté au serveur MQTT');
      this.isConnected = true;
      this.processMessageQueue();
    });

    this.client.on('error', (error) => {
      this.log.error('Erreur MQTT:', error.message);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      this.log.info('Connexion MQTT fermée');
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      this.log.info('Reconnexion MQTT...');
    });
  }

  public publish(topic: string, payload: string, callback?: () => void): void {
    if (this.isConnected && this.client) {
      this.client.publish(topic, payload, (error) => {
        if (error) {
          this.log.error(`Erreur publication MQTT ${topic}:`, error.message);
        } else {
          this.log.debug(`Message publié: ${topic} -> ${payload}`);
          if (callback) callback();
        }
      });
    } else {
      // Ajouter à la file d'attente si pas connecté
      this.messageQueue.push({ topic, payload, callback });
    }
  }

  public subscribe(topic: string, callback: (topic: string, message: Buffer) => void): void {
    if (this.isConnected && this.client) {
      this.client.subscribe(topic, (error) => {
        if (error) {
          this.log.error(`Erreur abonnement MQTT ${topic}:`, error.message);
        } else {
          this.log.debug(`Abonné au topic: ${topic}`);
        }
      });

      this.client!.on('message', callback);
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.publish(message.topic, message.payload, message.callback);
      }
    }
  }

  public isMQTTConnected(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
    this.isConnected = false;
  }
}
