export class ObjectRepository<T> {
	private entityMap: Map<string, T>

	constructor(entities: { [id: string]: T } | Map<string, T> | T[] = {}) {
		if (entities instanceof Map) {
			this.entityMap = new Map(entities)
		} else if (Array.isArray(entities)) {
			this.entityMap = new Map(entities.map(e => [(e as any).id, e]))
		} else {
			this.entityMap = new Map(Object.entries(entities))
		}
	}

	findById(id: string): T | undefined {
		return this.entityMap.get(id)
	}

	get(id: string): T | undefined {
		return this.entityMap.get(id)
	}

	findAll(): T[] {
		return Array.from(this.entityMap.values())
	}

	all(): T[] {
		return this.findAll()
	}

	upsertById(id: string, entity: T): this {
		this.entityMap.set(id, { ...entity })
		return this
	}

	set(id: string, entity: T): this {
		return this.upsertById(id, entity)
	}

	deleteById(id: string): boolean {
		return this.entityMap.delete(id)
	}

	delete(id: string): boolean {
		return this.deleteById(id)
	}

	count(): number {
		return this.entityMap.size
	}

	clear(): void {
		this.entityMap.clear()
	}

	toJSON(): T[] {
		return this.findAll()
	}

	fromJSON(entries: T[]): void {
		this.entityMap.clear()
		if (Array.isArray(entries)) {
			for (const entry of entries) {
				if ((entry as any)?.id) {
					this.entityMap.set((entry as any).id, entry)
				}
			}
		}
	}

	[Symbol.iterator](): IterableIterator<T> {
		return this.entityMap.values()
	}
}

export default ObjectRepository
