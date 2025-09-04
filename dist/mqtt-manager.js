"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MQTTManager = void 0;
var mqtt = require("mqtt");
var MQTTManager = /** @class */ (function () {
    function MQTTManager(config, log) {
        this.config = config;
        this.log = log;
        this.client = null;
        this.isConnected = false;
        this.messageQueue = [];
        this.reconnectTimer = null;
        this.connect();
    }
    MQTTManager.prototype.connect = function () {
        var _this = this;
        var options = {
            clientId: this.config.clientId || "homebridge-smart-blinds-".concat(Date.now()),
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30000,
        };
        if (this.config.username && this.config.password) {
            options.username = this.config.username;
            options.password = this.config.password;
        }
        var url = "mqtt://".concat(this.config.host, ":").concat(this.config.port);
        this.log.info("Connexion MQTT \u00E0 ".concat(url));
        this.client = mqtt.connect(url, options);
        this.client.on('connect', function () {
            _this.log.info('Connecté au serveur MQTT');
            _this.isConnected = true;
            _this.processMessageQueue();
        });
        this.client.on('error', function (error) {
            _this.log.error('Erreur MQTT:', error.message);
            _this.isConnected = false;
        });
        this.client.on('close', function () {
            _this.log.info('Connexion MQTT fermée');
            _this.isConnected = false;
        });
        this.client.on('reconnect', function () {
            _this.log.info('Reconnexion MQTT...');
        });
    };
    MQTTManager.prototype.publish = function (topic, payload, callback) {
        var _this = this;
        if (this.isConnected && this.client) {
            this.client.publish(topic, payload, function (error) {
                if (error) {
                    _this.log.error("Erreur publication MQTT ".concat(topic, ":"), error.message);
                }
                else {
                    _this.log.debug("Message publi\u00E9: ".concat(topic, " -> ").concat(payload));
                    if (callback)
                        callback();
                }
            });
        }
        else {
            // Ajouter à la file d'attente si pas connecté
            this.messageQueue.push({ topic: topic, payload: payload, callback: callback });
        }
    };
    MQTTManager.prototype.subscribe = function (topic, callback) {
        var _this = this;
        if (this.isConnected && this.client) {
            this.client.subscribe(topic, function (error) {
                if (error) {
                    _this.log.error("Erreur abonnement MQTT ".concat(topic, ":"), error.message);
                }
                else {
                    _this.log.debug("Abonn\u00E9 au topic: ".concat(topic));
                }
            });
            this.client.on('message', callback);
        }
    };
    MQTTManager.prototype.processMessageQueue = function () {
        while (this.messageQueue.length > 0) {
            var message = this.messageQueue.shift();
            if (message) {
                this.publish(message.topic, message.payload, message.callback);
            }
        }
    };
    MQTTManager.prototype.isMQTTConnected = function () {
        return this.isConnected;
    };
    MQTTManager.prototype.disconnect = function () {
        if (this.client) {
            this.client.end();
            this.client = null;
        }
        this.isConnected = false;
    };
    return MQTTManager;
}());
exports.MQTTManager = MQTTManager;
