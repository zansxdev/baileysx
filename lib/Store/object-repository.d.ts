export declare class ObjectRepository<T> {
    private entityMap;
    constructor(entities?: {
        [id: string]: T;
    } | Map<string, T> | T[]);
    findById(id: string): T | undefined;
    get(id: string): T | undefined;
    findAll(): T[];
    all(): T[];
    upsertById(id: string, entity: T): this;
    set(id: string, entity: T): this;
    deleteById(id: string): boolean;
    delete(id: string): boolean;
    count(): number;
    clear(): void;
    toJSON(): T[];
    fromJSON(entries: T[]): void;
    [Symbol.iterator](): IterableIterator<T>;
}
export default ObjectRepository;
//# sourceMappingURL=object-repository.d.ts.map