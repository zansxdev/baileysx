export interface OrderedDictionary<T> {
	array: T[]
	get: (id: string) => T | undefined
	upsert: (item: T, mode?: 'append' | 'prepend') => void
	update: (item: T) => boolean
	remove: (item: T) => boolean
	updateAssign: (id: string, update: Partial<T>) => boolean
	clear: () => void
	filter: (contain: (item: T) => boolean) => void
	toJSON: () => T[]
	fromJSON: (newItems: T[]) => void
	readonly length: number
	find: (predicate: (item: T, index: number, obj: T[]) => boolean) => T | undefined
	findIndex: (predicate: (item: T, index: number, obj: T[]) => boolean) => number
	some: (predicate: (item: T, index: number, obj: T[]) => boolean) => boolean
	every: (predicate: (item: T, index: number, obj: T[]) => boolean) => boolean
	map: <U>(callback: (item: T, index: number, array: T[]) => U) => U[]
	forEach: (callback: (item: T, index: number, array: T[]) => void) => void
	slice: (start?: number, end?: number) => T[]
	[Symbol.iterator]: () => IterableIterator<T>
	[key: string]: any
}

export default function makeOrderedDictionary<T>(
	idGetter: (item: T) => string,
	maxLimit?: number
): OrderedDictionary<T> {
	const array: T[] = []
	const dict: { [id: string]: T } = {}

	const get = (id: string): T | undefined => dict[id]

	const enforceLimit = () => {
		if (typeof maxLimit === 'number' && maxLimit > 0) {
			while (array.length > maxLimit) {
				const oldest = array.shift()
				if (oldest) {
					const oldId = idGetter(oldest)
					delete dict[oldId]
				}
			}
		}
	}

	const update = (item: T): boolean => {
		const id = idGetter(item)
		const idx = array.findIndex(i => idGetter(i) === id)
		if (idx >= 0) {
			array[idx] = item
			dict[id] = item
			return true
		}

		return false
	}

	const upsert = (item: T, mode: 'append' | 'prepend' = 'append') => {
		const id = idGetter(item)
		if (dict[id]) {
			update(item)
		} else {
			if (mode === 'append') {
				array.push(item)
			} else {
				array.unshift(item)
			}

			dict[id] = item
			enforceLimit()
		}
	}

	const remove = (item: T): boolean => {
		const id = idGetter(item)
		const idx = array.findIndex(i => idGetter(i) === id)
		if (idx >= 0) {
			array.splice(idx, 1)
			delete dict[id]
			return true
		}

		return false
	}

	const updateAssign = (id: string, updateData: Partial<T>): boolean => {
		const item = get(id)
		if (item) {
			Object.assign(item as any, updateData)
			const newId = idGetter(item)
			if (newId !== id) {
				delete dict[id]
				dict[newId] = item
			}

			return true
		}

		return false
	}

	const clear = () => {
		array.length = 0
		for (const key of Object.keys(dict)) {
			delete dict[key]
		}
	}

	const filter = (contain: (item: T) => boolean) => {
		let i = 0
		while (i < array.length) {
			if (!contain(array[i]!)) {
				delete dict[idGetter(array[i]!)]
				array.splice(i, 1)
			} else {
				i++
			}
		}
	}

	const toJSON = () => array

	const fromJSON = (newItems: T[]) => {
		clear()
		for (const item of newItems) {
			upsert(item, 'append')
		}
	}

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
			return array.length
		},
		find: (predicate: (item: T, index: number, obj: T[]) => boolean) => array.find(predicate),
		findIndex: (predicate: (item: T, index: number, obj: T[]) => boolean) => array.findIndex(predicate),
		some: (predicate: (item: T, index: number, obj: T[]) => boolean) => array.some(predicate),
		every: (predicate: (item: T, index: number, obj: T[]) => boolean) => array.every(predicate),
		map: <U>(callback: (item: T, index: number, array: T[]) => U) => array.map(callback),
		forEach: (callback: (item: T, index: number, array: T[]) => void) => array.forEach(callback),
		slice: (start?: number, end?: number) => array.slice(start, end),
		[Symbol.iterator]: () => array[Symbol.iterator]()
	}

	return new Proxy(baseObj, {
		get(target, prop, receiver) {
			if (typeof prop === 'string') {
				if (prop in target) {
					return Reflect.get(target, prop, receiver)
				}

				const num = Number(prop)
				if (!isNaN(num) && Number.isInteger(num)) {
					return target.array[num]
				}

				return target.get(prop)
			}

			return Reflect.get(target, prop, receiver)
		},
		set(target, prop, value, receiver) {
			if (typeof prop === 'string' && !(prop in target)) {
				target.upsert(value, 'append')
				return true
			}

			return Reflect.set(target, prop, value, receiver)
		}
	}) as OrderedDictionary<T>
}
