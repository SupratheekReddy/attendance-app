// Geofence checker — verifies user is within office perimeter
const GEO = {
  config: null,

  async loadConfig() {
    if (this.config) return this.config;
    try {
      const res = await fetch('/api/config/geo');
      this.config = await res.json();
      return this.config;
    } catch {
      throw new Error('Failed to load geofence config.');
    }
  },

  haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  async check() {
    const cfg = await this.loadConfig();
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject('Geolocation is not supported by your browser.');
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          const dist = this.haversine(
            pos.coords.latitude, pos.coords.longitude,
            cfg.lat, cfg.lng
          );
          if (dist <= cfg.radius) {
            resolve(Math.round(dist));
          } else {
            const currentCoords = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
            reject(`You are ${Math.round(dist)}m away. Your current location is [${currentCoords}]. Must be within ${cfg.radius}m of office.`);
          }
        },
        () => reject('Location permission denied. Required for attendance.'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
};
