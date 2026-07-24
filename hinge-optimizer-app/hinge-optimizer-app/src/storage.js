// Polyfill de window.storage (API de stockage des artifacts Claude) basé sur
// localStorage, pour que le composant applicatif fonctionne à l'identique
// une fois sorti de l'environnement Claude.
const NS = "hinge-optimizer:";

function fullKey(key) {
  return NS + key;
}

export function installStorage() {
  window.storage = {
    async get(key) {
      try {
        const raw = localStorage.getItem(fullKey(key));
        if (raw === null) return null;
        return { key, value: raw };
      } catch (e) {
        return null;
      }
    },
    async set(key, value) {
      localStorage.setItem(fullKey(key), value);
      return { key, value };
    },
    async delete(key) {
      localStorage.removeItem(fullKey(key));
      return { key, deleted: true };
    },
    async list(prefix = "") {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(fullKey(prefix))) keys.push(k.slice(NS.length));
      }
      return { keys };
    },
  };
}
