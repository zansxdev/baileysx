export default class KeyedDB {
    constructor(compareFn, keyGetter) {
        this._array = [];
        this._dict = {};
        if (typeof compareFn !== 'function' || typeof keyGetter !== 'function') {
            throw new Error('KeyedDB requires compare and keyGetter functions');
        }
        this._compare = compareFn;
        this._keyGetter = keyGetter;
    }
    _getEntityId(entry) {
        const anyEntry = entry;
        if (anyEntry && typeof anyEntry === 'object' && typeof anyEntry.id === 'string' && anyEntry.id) {
            return anyEntry.id;
        }
        return String(this._keyGetter(entry));
    }
    get length() {
        return this._array.length;
    }
    get(id) {
        return this._dict[String(id)];
    }
    set(id, entry) {
        return this.upsert(entry).length > 0;
    }
    insert(entry, mode = 'insert') {
        const key = this._keyGetter(entry);
        const keyStr = String(key);
        const entityId = this._getEntityId(entry);
        const existing = this._dict[entityId] || this._dict[keyStr];
        if (existing && mode === 'insert') {
            return false;
        }
        if (existing) {
            const idx = this._array.indexOf(existing);
            if (idx >= 0) {
                this._array.splice(idx, 1);
            }
            delete this._dict[this._getEntityId(existing)];
            delete this._dict[String(this._keyGetter(existing))];
        }
        this._dict[entityId] = entry;
        this._dict[keyStr] = entry;
        let inserted = false;
        for (let i = 0; i < this._array.length; i++) {
            const cmp = this._compare(this._keyGetter(this._array[i]), key);
            if (cmp < 0) {
                this._array.splice(i, 0, entry);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            this._array.push(entry);
        }
        return true;
    }
    insertIfAbsent(...entries) {
        const added = [];
        for (const entry of entries) {
            const entityId = this._getEntityId(entry);
            const keyStr = String(this._keyGetter(entry));
            if (!this._dict[entityId] && !this._dict[keyStr]) {
                this.insert(entry, 'insert');
                added.push(entry);
            }
        }
        return added;
    }
    upsert(...entries) {
        const added = [];
        for (const entry of entries) {
            this.insert(entry, 'upsert');
            added.push(entry);
        }
        return added;
    }
    update(id, updater) {
        const item = this.get(id);
        if (!item) {
            return false;
        }
        const oldKeyStr = String(this._keyGetter(item));
        const oldEntityId = this._getEntityId(item);
        delete this._dict[oldKeyStr];
        delete this._dict[oldEntityId];
        updater(item);
        const newKey = this._keyGetter(item);
        const newKeyStr = String(newKey);
        const newEntityId = this._getEntityId(item);
        this._dict[newEntityId] = item;
        this._dict[newKeyStr] = item;
        const idx = this._array.indexOf(item);
        if (idx >= 0) {
            this._array.splice(idx, 1);
        }
        let inserted = false;
        for (let i = 0; i < this._array.length; i++) {
            const cmp = this._compare(this._keyGetter(this._array[i]), newKey);
            if (cmp < 0) {
                this._array.splice(i, 0, item);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            this._array.push(item);
        }
        return true;
    }
    updateAssign(id, update) {
        return this.update(id, item => {
            Object.assign(item, update);
        });
    }
    deleteById(id) {
        const item = this.get(id);
        if (!item) {
            return false;
        }
        const keyStr = String(this._keyGetter(item));
        const entityId = this._getEntityId(item);
        delete this._dict[keyStr];
        delete this._dict[entityId];
        const idx = this._array.indexOf(item);
        if (idx >= 0) {
            this._array.splice(idx, 1);
        }
        return true;
    }
    delete(id) {
        return this.deleteById(id);
    }
    clear() {
        this._array = [];
        this._dict = {};
    }
    all() {
        return [...this._array];
    }
    filter(predicate) {
        this._array = this._array.filter(predicate);
        this._dict = {};
        for (const entry of this._array) {
            this._dict[this._getEntityId(entry)] = entry;
            this._dict[String(this._keyGetter(entry))] = entry;
        }
    }
    count() {
        return this._array.length;
    }
    toJSON() {
        return this.all();
    }
    fromJSON(entries) {
        this.clear();
        if (Array.isArray(entries)) {
            this.upsert(...entries);
        }
    }
    [Symbol.iterator]() {
        return this._array[Symbol.iterator]();
    }
}
//# sourceMappingURL=keyed-db.js.map