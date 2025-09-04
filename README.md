# Homebridge Blinds Zigbee MQTT Relay

Plugin Homebridge pour piloter des volets roulants via relais Zigbee et MQTT (eWeLink, MHCOZY) avec gestion intelligente des commandes.

## 🎯 Fonctionnalités

- **Pilotage MQTT** : Communication avec votre serveur MQTT (zigbee2mqtt)
- **Gestion intelligente des relais** : Support des relais eWeLink 2CH et MHCOZY 4CH
- **File d'attente des commandes** : Évite les superpositions RF en espacant les impulsions
- **Logique intelligente** : Gestion différenciée selon l'état du volet (fermé/ouvert/intermédiaire)
- **Détection des doubles impulsions** : Surveillance des états des relais pour corriger les erreurs
- **Intégration HomeKit native** : Contrôle via l'app Maison d'Apple

## 🔧 Prérequis

- Homebridge ou HOOBS installé
- Serveur MQTT (Mosquitto, etc.)
- zigbee2mqtt configuré
- Relais Zigbee compatibles (eWeLink ZB-SW02, MHCOZY TYWB 4ch-RF)

## 📦 Installation

1. **Installation du plugin** :
   ```bash
   npm install -g homebridge-blinds-zigbee-mqtt-relay
   ```

2. **Redémarrage de Homebridge** :
   ```bash
   sudo systemctl restart homebridge
   # ou via l'interface HOOBS
   ```

## ⚙️ Configuration

### Configuration de base

Ajoutez la configuration suivante dans votre `config.json` :

```json
{
  "accessories": [
    {
      "accessory": "BlindsZigbeeMqttRelay",
      "name": "Volet Salon",
      "mqtt": {
        "host": "192.168.1.100",
        "port": 1883,
        "username": "mqtt_user",
        "password": "mqtt_password"
      },
      "relayName": "relay_salon",
      "relayType": "eweLink-2CH",
      "channels": {
        "up": "1",
        "down": "2"
      },
      "mqttTopic": "zigbee2mqtt",
      "openDuration": 25,
      "queueDelay": 2
    }
  ]
}
```

### Paramètres de configuration

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `name` | string | ✅ | Nom unique du volet |
| `mqtt.host` | string | ✅ | Adresse IP du serveur MQTT |
| `mqtt.port` | number | ✅ | Port du serveur MQTT |
| `mqtt.username` | string | ❌ | Nom d'utilisateur MQTT |
| `mqtt.password` | string | ❌ | Mot de passe MQTT |
| `relayName` | string | ✅ | Nom du relais dans zigbee2mqtt |
| `relayType` | string | ❌ | Type de relais (`eweLink-2CH` ou `mhcozy-4CH`) |
| `channels.up` | string | ✅ | Canal pour monter le volet |
| `channels.down` | string | ✅ | Canal pour descendre le volet |
| `mqttTopic` | string | ❌ | Topic MQTT de base (défaut: `zigbee2mqtt`) |
| `openDuration` | number | ❌ | Durée d'ouverture en secondes (défaut: 30) |
| `queueDelay` | number | ❌ | Délai entre commandes en secondes (défaut: 2) |

## 🧠 Logique intelligente

### Gestion des états

Le plugin implémente une logique intelligente pour éviter les problèmes de synchronisation :

1. **Volet fermé (0%)** → Commande UP : Envoie d'abord DOWN puis UP
2. **Volet ouvert (100%)** → Commande DOWN : Envoie d'abord UP puis DOWN  
3. **États intermédiaires** → Commande directe UP ou DOWN

### File d'attente des commandes

- Les commandes sont mises en file d'attente
- Espacement configurable entre les impulsions
- Évite les superpositions RF des télécommandes

### Détection des erreurs

- Surveillance des états des relais via MQTT
- Détection des doubles impulsions accidentelles
- Possibilité de correction automatique

## 🔌 Types de relais supportés

### eWeLink ZB-SW02 (2CH)
- 2 canaux indépendants
- Configuration : `"relayType": "eweLink-2CH"`
- Canaux typiques : `"up": "1"`, `"down": "2"`

### MHCOZY TYWB 4ch-RF (4CH)
- 4 canaux indépendants
- Configuration : `"relayType": "mhcozy-4CH"`
- Canaux typiques : `"up": "3"`, `"down": "4"`

## 📱 Utilisation dans HomeKit

Une fois configuré, vos volets apparaîtront dans l'app Maison :

- **Contrôle de position** : 0% (fermé) à 100% (ouvert)
- **Commandes vocales** : "Hey Siri, ouvre le volet du salon à 50%"
- **Automatisations** : Ouverture automatique au lever du soleil
- **Scènes** : "Tous les volets fermés" pour la nuit

## 🚨 Dépannage

### Problèmes courants

1. **Connexion MQTT échoue**
   - Vérifiez l'adresse IP et le port
   - Contrôlez les identifiants de connexion
   - Testez la connectivité réseau

2. **Volets ne répondent pas**
   - Vérifiez les noms des relais dans zigbee2mqtt
   - Contrôlez la configuration des canaux
   - Vérifiez les logs Homebridge

3. **Mouvements erratiques**
   - Ajustez le `queueDelay` pour plus d'espacement
   - Vérifiez la durée d'ouverture (`openDuration`)
   - Contrôlez la logique des télécommandes

### Logs

Activez le mode debug dans Homebridge pour voir les logs détaillés :

```json
{
  "bridge": {
    "debug": true
  }
}
```

## 🔄 Mise à jour

```bash
npm update -g homebridge-blinds-zigbee-mqtt-relay
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

- Signaler des bugs
- Proposer des améliorations
- Soumettre des pull requests

## 👨‍💻 Auteur

**tomtom14z** - [GitHub](https://github.com/tomtom14z) | [npm](https://www.npmjs.com/~tomtom14z)

## 📄 Licence

MIT License - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- Basé sur le plugin [homebridge-blinds](https://plugins.hoobs.org/plugin/homebridge-blinds)
- Communauté Homebridge pour l'inspiration
- zigbee2mqtt pour l'intégration Zigbee
- Merci à tous les contributeurs de la communauté Homebridge

---

**Note** : Ce plugin est conçu pour fonctionner avec des relais en mode impulsion ponctuelle. Assurez-vous que vos relais sont configurés correctement dans zigbee2mqtt.
