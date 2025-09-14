"use strict";
var accessory_1 = require("./accessory");
var PLUGIN_NAME = 'homebridge-blinds-zigbee-mqtt-relay';
var ACCESSORY_NAME = 'BlindsZigbeeMqttRelay';
module.exports = function (api) {
    // Forcer le type pour contourner l'erreur TypeScript
    var SmartBlindsConstructor = accessory_1.SmartBlindsAccessory;
    api.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, SmartBlindsConstructor);
};
