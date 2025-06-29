module.exports = {
    dataCollectionInterval: process.env.DATA_COLLECTION_INTERVAL || 5000,
    maxReconnectAttempts: process.env.MAX_RECONNECT_ATTEMPTS || 3,
    mqttQos: process.env.MQTT_QOS || 1
};