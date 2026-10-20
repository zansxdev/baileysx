export class ObjectRepository {
    constructor(entities = {}) {
        if (entities instanceof Map) {
            this.entityMap = new Map(entities);
        }
        else if (Array.isArray(entities)) {
            this.entityMap = new Map(entities.map(e => [e.id, e]));
        }
        else {
            this.entityMap = new Map(Object.entries(entities));
        }
    }
    findById(id) {
        return this.entityMap.get(id);
    }
    get(id) {
        return this.entityMap.get(id);
    }
    findAll() {
        return Array.from(this.entityMap.values());
    }
    all() {
        return this.findAll();
    }
    upsertById(id, entity) {
        this.entityMap.set(id, { ...entity });
        return this;
    }
    set(id, entity) {
        return this.upsertById(id, entity);
    }
    deleteById(id) {
        return this.entityMap.delete(id);
    }
    delete(id) {
        return this.deleteById(id);
    }
    count() {
        return this.entityMap.size;
    }
    clear() {
        this.entityMap.clear();
    }
    toJSON() {
        return this.findAll();
    }
    fromJSON(entries) {
        this.entityMap.clear();
        if (Array.isArray(entries)) {
            for (const entry of entries) {
                if (entry?.id) {
                    this.entityMap.set(entry.id, entry);
                }
            }
        }
    }
    [Symbol.iterator]() {
        return this.entityMap.values();
    }
}
export default ObjectRepository;
//# sourceMappingURL=object-repository.js.map