export default function makeOrderedDictionary(idGetter, maxLimit) {
    const array = [];
    const dict = {};
    const get = (id) => dict[id];
    const enforceLimit = () => {
        if (typeof maxLimit === 'number' && maxLimit > 0) {
            while (array.length > maxLimit) {
                const oldest = array.shift();
                if (oldest) {
                    const oldId = idGetter(oldest);
                    delete dict[oldId];
                }
            }
        }
    };
    const update = (item) => {
        const id = idGetter(item);
        const idx = array.findIndex(i => idGetter(i) === id);
        if (idx >= 0) {
            array[idx] = item;
            dict[id] = item;
            return true;
        }
        return false;
    };
    const upsert = (item, mode = 'append') => {
        const id = idGetter(item);
        if (dict[id]) {
            update(item);
        }
        else {
            if (mode === 'append') {
                array.push(item);
            }
            else {
                array.unshift(item);
            }
            dict[id] = item;
            enforceLimit();
        }
    };
    const remove = (item) => {
        const id = idGetter(item);
        const idx = array.findIndex(i => idGetter(i) === id);
        if (idx >= 0) {
            array.splice(idx, 1);
            delete dict[id];
            return true;
        }
        return false;
    };
    const updateAssign = (id, updateData) => {
        const item = get(id);
        if (item) {
            Object.assign(item, updateData);
            const newId = idGetter(item);
            if (newId !== id) {
                delete dict[id];
                dict[newId] = item;
            }
            return true;
        }
        return false;
    };
    const clear = () => {
        array.length = 0;
        for (const key of Object.keys(dict)) {
            delete dict[key];
        }
    };
    const filter = (contain) => {
        let i = 0;
        while (i < array.length) {
            if (!contain(array[i])) {
                delete dict[idGetter(array[i])];
                array.splice(i, 1);
            }
            else {
                i++;
            }
        }
    };
    const toJSON = () => array;
    const fromJSON = (newItems) => {
        clear();
        for (const item of newItems) {
            upsert(item, 'append');
        }
    };
    const baseObj = {
        array,
        get,
        upsert,
        update,
        remove,
        updateAssign,
        clear,
        filter,
        toJSON,
        fromJSON,
        get length() {
            return array.length;
        },
        find: (predicate) => array.find(predicate),
        findIndex: (predicate) => array.findIndex(predicate),
        some: (predicate) => array.some(predicate),
        every: (predicate) => array.every(predicate),
        map: (callback) => array.map(callback),
        forEach: (callback) => array.forEach(callback),
        slice: (start, end) => array.slice(start, end),
        [Symbol.iterator]: () => array[Symbol.iterator]()
    };
    return new Proxy(baseObj, {
        get(target, prop, receiver) {
            if (typeof prop === 'string') {
                if (prop in target) {
                    return Reflect.get(target, prop, receiver);
                }
                const num = Number(prop);
                if (!isNaN(num) && Number.isInteger(num)) {
                    return target.array[num];
                }
                return target.get(prop);
            }
            return Reflect.get(target, prop, receiver);
        },
        set(target, prop, value, receiver) {
            if (typeof prop === 'string' && !(prop in target)) {
                target.upsert(value, 'append');
                return true;
            }
            return Reflect.set(target, prop, value, receiver);
        }
    });
}
//# sourceMappingURL=make-ordered-dictionary.js.map