import { API, Logging, AccessoryConfig } from 'homebridge';
import { SmartBlindsAccessory } from './accessory';

const PLUGIN_NAME = 'homebridge-blinds-zigbee-mqtt-relay';
const ACCESSORY_NAME = 'BlindsZigbeeMqttRelay';

export = (api: API) => {
  // Forcer le type pour contourner l'erreur TypeScript
  const SmartBlindsConstructor = SmartBlindsAccessory as any;
  api.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, SmartBlindsConstructor);
};
