export default class KeyedDB<T, K = string> {
    private _compare;
    private _keyGetter;
    private _array;
    private _dict;
    constructor(compareFn: (k1: K, k2: K) => number, keyGetter: (entry: T) => K);
    private _getEntityId;
    get length(): number;
    get(id: K | string): T | undefined;
    set(id: K | string, entry: T): boolean;
    insert(entry: T, mode?: 'insert' | 'upsert'): boolean;
    insertIfAbsent(...entries: T[]): T[];
    upsert(...entries: T[]): T[];
    update(id: K | string, updater: (entry: T) => void): boolean;
    updateAssign(id: K | string, update: Partial<T>): boolean;
    deleteById(id: K | string): boolean;
    delete(id: K | string): boolean;
    clear(): void;
    all(): T[];
    filter(predicate: (entry: T) => boolean): void;
    count(): number;
    toJSON(): T[];
    fromJSON(entries: T[]): void;
    [Symbol.iterator](): IterableIterator<T>;
}
//# sourceMappingURL=keyed-db.d.ts.map