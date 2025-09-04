"use strict";
var accessory_1 = require("./accessory");
var PLUGIN_NAME = 'homebridge-smart-blinds';
var ACCESSORY_NAME = 'SmartBlinds';
module.exports = function (api) {
    // Forcer le type pour contourner l'erreur TypeScript
    var SmartBlindsConstructor = accessory_1.SmartBlindsAccessory;
    api.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, SmartBlindsConstructor);
};
