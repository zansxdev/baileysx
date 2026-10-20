export interface OrderedDictionary<T> {
    array: T[];
    get: (id: string) => T | undefined;
    upsert: (item: T, mode?: 'append' | 'prepend') => void;
    update: (item: T) => boolean;
    remove: (item: T) => boolean;
    updateAssign: (id: string, update: Partial<T>) => boolean;
    clear: () => void;
    filter: (contain: (item: T) => boolean) => void;
    toJSON: () => T[];
    fromJSON: (newItems: T[]) => void;
    readonly length: number;
    find: (predicate: (item: T, index: number, obj: T[]) => boolean) => T | undefined;
    findIndex: (predicate: (item: T, index: number, obj: T[]) => boolean) => number;
    some: (predicate: (item: T, index: number, obj: T[]) => boolean) => boolean;
    every: (predicate: (item: T, index: number, obj: T[]) => boolean) => boolean;
    map: <U>(callback: (item: T, index: number, array: T[]) => U) => U[];
    forEach: (callback: (item: T, index: number, array: T[]) => void) => void;
    slice: (start?: number, end?: number) => T[];
    [Symbol.iterator]: () => IterableIterator<T>;
    [key: string]: any;
}
export default function makeOrderedDictionary<T>(idGetter: (item: T) => string, maxLimit?: number): OrderedDictionary<T>;
//# sourceMappingURL=make-ordered-dictionary.d.ts.map