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
exports.SmartBlindsAccessory = void 0;
var blind_controller_1 = require("./blind-controller");
var SmartBlindsAccessory = /** @class */ (function () {
    function SmartBlindsAccessory(api, log, config) {
        this.api = api;
        this.log = log;
        this.config = config;
        this.blindConfig = config;
        // Créer le contrôleur de volets pour cet accessoire
        this.blindController = new blind_controller_1.BlindController(new (require('./mqtt-manager').MQTTManager)(this.config.mqtt, this.log), this.log, { blinds: [this.blindConfig] });
        // Initialiser le volet dans le contrôleur
        this.blindController.initializeBlind(this.blindConfig.name, this.blindConfig);
        // Créer le service WindowCovering
        this.service = new this.api.hap.Service.WindowCovering(this.blindConfig.name);
        // Obtenir la caractéristique TargetPosition
        this.characteristic = this.service.getCharacteristic(this.api.hap.Characteristic.TargetPosition);
        // Configurer les gestionnaires d'événements
        this.setupEventHandlers();
        this.log.info("Accessoire volet cr\u00E9\u00E9: ".concat(this.blindConfig.name));
    }
    SmartBlindsAccessory.prototype.setupEventHandlers = function () {
        var _this = this;
        // Gérer les changements de position cible
        this.characteristic.on('set', function (value, callback) { return __awaiter(_this, void 0, void 0, function () {
            var targetPosition, currentState, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        targetPosition = value;
                        currentState = this.blindController.getBlindState(this.blindConfig.name);
                        if (!currentState) {
                            callback(new Error('État du volet non trouvé'));
                            return [2 /*return*/];
                        }
                        this.log.info("".concat(this.blindConfig.name, ": Position cible ").concat(targetPosition, "%"));
                        if (!(targetPosition > currentState.position)) return [3 /*break*/, 2];
                        // Monter le volet
                        return [4 /*yield*/, this.blindController.moveBlind(this.blindConfig.name, 'up', this.blindConfig)];
                    case 1:
                        // Monter le volet
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        if (!(targetPosition < currentState.position)) return [3 /*break*/, 4];
                        // Descendre le volet
                        return [4 /*yield*/, this.blindController.moveBlind(this.blindConfig.name, 'down', this.blindConfig)];
                    case 3:
                        // Descendre le volet
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        callback(null);
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _a.sent();
                        this.log.error("Erreur lors du mouvement du volet ".concat(this.blindConfig.name, ":"), error_1);
                        callback(error_1);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        }); });
        // Gérer les requêtes de position actuelle
        this.service.getCharacteristic(this.api.hap.Characteristic.CurrentPosition)
            .on('get', function (callback) {
            var state = _this.blindController.getBlindState(_this.blindConfig.name);
            if (state) {
                callback(null, state.position);
            }
            else {
                callback(new Error('État du volet non trouvé'));
            }
        });
        // Gérer les requêtes de position cible
        this.characteristic.on('get', function (callback) {
            var state = _this.blindController.getBlindState(_this.blindConfig.name);
            if (state) {
                callback(null, state.position);
            }
            else {
                callback(new Error('État du volet non trouvé'));
            }
        });
        // Gérer l'état de position (ouvert/fermé)
        this.service.getCharacteristic(this.api.hap.Characteristic.PositionState)
            .on('get', function (callback) {
            var state = _this.blindController.getBlindState(_this.blindConfig.name);
            if (state) {
                if (state.isMoving) {
                    if (state.lastCommand === 'up') {
                        callback(null, _this.api.hap.Characteristic.PositionState.INCREASING);
                    }
                    else if (state.lastCommand === 'down') {
                        callback(null, _this.api.hap.Characteristic.PositionState.DECREASING);
                    }
                    else {
                        callback(null, _this.api.hap.Characteristic.PositionState.STOPPED);
                    }
                }
                else {
                    callback(null, _this.api.hap.Characteristic.PositionState.STOPPED);
                }
            }
            else {
                callback(new Error('État du volet non trouvé'));
            }
        });
        // Mettre à jour l'état toutes les secondes pendant le mouvement
        setInterval(function () {
            var state = _this.blindController.getBlindState(_this.blindConfig.name);
            if (state && state.isMoving) {
                _this.service.updateCharacteristic(_this.api.hap.Characteristic.CurrentPosition, state.position);
                _this.service.updateCharacteristic(_this.api.hap.Characteristic.TargetPosition, state.position);
            }
        }, 1000);
    };
    // Méthode pour obtenir le service (appelée par Homebridge)
    SmartBlindsAccessory.prototype.getServices = function () {
        return [this.service];
    };
    // Méthode pour mettre à jour la position du volet
    SmartBlindsAccessory.prototype.updatePosition = function (position) {
        this.blindController.setBlindPosition(this.blindConfig.name, position);
        this.service.updateCharacteristic(this.api.hap.Characteristic.CurrentPosition, position);
        this.service.updateCharacteristic(this.api.hap.Characteristic.TargetPosition, position);
    };
    return SmartBlindsAccessory;
}());
exports.SmartBlindsAccessory = SmartBlindsAccessory;
