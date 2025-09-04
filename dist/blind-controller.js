"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlindController = void 0;
var BlindController = /** @class */ (function () {
    function BlindController(mqttManager, log, config) {
        this.mqttManager = mqttManager;
        this.log = log;
        this.config = config;
        this.blinds = new Map();
        this.commandQueue = [];
        this.isProcessingQueue = false;
        this.relayStates = new Map();
        this.initializeRelayMonitoring();
    }
    BlindController.prototype.initializeRelayMonitoring = function () {
        var _this = this;
        // Surveiller l'état des relais pour détecter les doubles impulsions
        this.config.blinds.forEach(function (blind) {
            var stateTopic = "zigbee2mqtt/".concat(blind.relayName);
            _this.mqttManager.subscribe(stateTopic, function (topic, message) {
                _this.handleRelayStateUpdate(blind.relayName, message.toString());
            });
        });
    };
    BlindController.prototype.handleRelayStateUpdate = function (relayName, message) {
        var _this = this;
        try {
            var state_1 = JSON.parse(message);
            var currentStates_1 = this.relayStates.get(relayName) || {};
            // Détecter les changements d'état
            Object.keys(state_1).forEach(function (channel) {
                if (channel.startsWith('state_') && state_1[channel] === 'ON') {
                    var channelName = channel.replace('state_', '');
                    currentStates_1[channelName] = true;
                    // Détecter les doubles impulsions
                    _this.detectDoubleImpulse(relayName, channelName);
                }
            });
            this.relayStates.set(relayName, currentStates_1);
        }
        catch (error) {
            this.log.error("Erreur parsing \u00E9tat relais ".concat(relayName, ":"), error);
        }
    };
    BlindController.prototype.detectDoubleImpulse = function (relayName, channelName) {
        // Logique pour détecter les doubles impulsions accidentelles
        // et envoyer une commande de correction si nécessaire
        this.log.debug("Impulsion d\u00E9tect\u00E9e sur ".concat(relayName, " canal ").concat(channelName));
    };
    BlindController.prototype.initializeBlind = function (blindName, config) {
        this.blinds.set(blindName, {
            position: 0,
            isMoving: false,
            lastCommand: null,
            lastCommandTime: 0
        });
    };
    BlindController.prototype.moveBlind = function (blindName, command, config) {
        return __awaiter(this, void 0, void 0, function () {
            var blind, actualCommand;
            var _this = this;
            return __generator(this, function (_a) {
                blind = this.blinds.get(blindName);
                if (!blind) {
                    this.log.error("Volet ".concat(blindName, " non trouv\u00E9"));
                    return [2 /*return*/];
                }
                actualCommand = command;
                if (command === 'up' && blind.position === 0) {
                    // Si le volet est complètement fermé, commencer par DOWN puis UP
                    actualCommand = 'down';
                    this.log.info("Volet ".concat(blindName, " ferm\u00E9, commande DOWN puis UP"));
                }
                else if (command === 'down' && blind.position === 100) {
                    // Si le volet est complètement ouvert, commencer par UP puis DOWN
                    actualCommand = 'up';
                    this.log.info("Volet ".concat(blindName, " ouvert, commande UP puis DOWN"));
                }
                // Ajouter à la file d'attente avec délai
                this.addToQueue(blindName, actualCommand, config);
                // Si c'était une commande spéciale, ajouter la commande finale
                if (actualCommand !== command) {
                    setTimeout(function () {
                        _this.addToQueue(blindName, command, config);
                    }, 1000); // 1 seconde entre les commandes
                }
                return [2 /*return*/];
            });
        });
    };
    BlindController.prototype.addToQueue = function (blindName, command, config) {
        var queueItem = {
            blindName: blindName,
            command: command,
            timestamp: Date.now()
        };
        this.commandQueue.push(queueItem);
        this.log.debug("Commande ajout\u00E9e \u00E0 la file: ".concat(blindName, " ").concat(command));
        if (!this.isProcessingQueue) {
            this.processQueue();
        }
    };
    BlindController.prototype.processQueue = function () {
        return __awaiter(this, void 0, void 0, function () {
            var item, blind, timeSinceLastCommand, config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isProcessingQueue || this.commandQueue.length === 0) {
                            return [2 /*return*/];
                        }
                        this.isProcessingQueue = true;
                        _a.label = 1;
                    case 1:
                        if (!(this.commandQueue.length > 0)) return [3 /*break*/, 9];
                        item = this.commandQueue.shift();
                        if (!item)
                            return [3 /*break*/, 1];
                        blind = this.blinds.get(item.blindName);
                        if (!blind)
                            return [3 /*break*/, 1];
                        timeSinceLastCommand = Date.now() - blind.lastCommandTime;
                        if (!(timeSinceLastCommand < (this.config.globalQueueDelay || 2000))) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.delay(this.config.globalQueueDelay || 2000 - timeSinceLastCommand)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: 
                    // Exécuter la commande
                    return [4 /*yield*/, this.executeCommand(item.blindName, item.command, this.getBlindConfig(item.blindName))];
                    case 4:
                        // Exécuter la commande
                        _a.sent();
                        // Mettre à jour l'état du volet
                        blind.lastCommand = item.command;
                        blind.lastCommandTime = Date.now();
                        blind.isMoving = true;
                        config = this.getBlindConfig(item.blindName);
                        if (!config) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.delay(config.openDuration * 1000)];
                    case 5:
                        _a.sent();
                        blind.isMoving = false;
                        // Mettre à jour la position
                        if (item.command === 'up') {
                            blind.position = Math.min(100, blind.position + 25);
                        }
                        else {
                            blind.position = Math.max(0, blind.position - 25);
                        }
                        _a.label = 6;
                    case 6:
                        if (!(this.commandQueue.length > 0)) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.delay(this.config.globalQueueDelay || 2000)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8: return [3 /*break*/, 1];
                    case 9:
                        this.isProcessingQueue = false;
                        return [2 /*return*/];
                }
            });
        });
    };
    BlindController.prototype.executeCommand = function (blindName, command, config) {
        return __awaiter(this, void 0, void 0, function () {
            var channel, topic, payload;
            var _a;
            var _this = this;
            return __generator(this, function (_b) {
                if (!config) {
                    this.log.error("Configuration non trouv\u00E9e pour ".concat(blindName));
                    return [2 /*return*/];
                }
                channel = command === 'up' ? config.channels.up : config.channels.down;
                topic = "".concat(config.mqttTopic, "/set");
                payload = JSON.stringify((_a = {}, _a["state_".concat(channel)] = 'ON', _a));
                this.log.info("Ex\u00E9cution commande: ".concat(blindName, " ").concat(command, " -> ").concat(topic, " ").concat(payload));
                return [2 /*return*/, new Promise(function (resolve) {
                        _this.mqttManager.publish(topic, payload, resolve);
                    })];
            });
        });
    };
    BlindController.prototype.getBlindConfig = function (blindName) {
        return this.config.blinds.find(function (b) { return b.name === blindName; });
    };
    BlindController.prototype.delay = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    BlindController.prototype.getBlindState = function (blindName) {
        return this.blinds.get(blindName);
    };
    BlindController.prototype.setBlindPosition = function (blindName, position) {
        var blind = this.blinds.get(blindName);
        if (blind) {
            blind.position = Math.max(0, Math.min(100, position));
        }
    };
    return BlindController;
}());
exports.BlindController = BlindController;
