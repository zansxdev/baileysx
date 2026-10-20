import type { proto } from '../../WAProto/index.js'
import type { Chat, PresenceData } from '../Types/Chat.js'
import type { Contact } from '../Types/Contact.js'
import type { BaileysEventEmitter } from '../Types/Events.js'
import type { GroupMetadata } from '../Types/GroupMetadata.js'
import type { Label } from '../Types/Label.js'
import type { LabelAssociation } from '../Types/LabelAssociation.js'
import type { WAMessageCursor, WAMessageKey } from '../Types/Message.js'
import type { ConnectionState } from '../Types/State.js'
import type { ILogger } from '../Utils/logger.js'
import type KeyedDB from './keyed-db.js'
import type { OrderedDictionary } from './make-ordered-dictionary.js'
import type ObjectRepository from './object-repository.js'

export type Comparable<T> = {
	key: (item: T) => string
	compare: (k1: string, k2: string) => number
}

export type MessageCursor =
	| WAMessageCursor
	| { before: string | WAMessageKey | undefined }
	| { after: string | WAMessageKey | undefined }

export interface BaileysInMemoryStoreConfig {
	chatKey?: Comparable<Chat>
	labelAssociationKey?: Comparable<LabelAssociation>
	logger?: ILogger
	socket?: any
	maxMessagesPerChat?: number
	filterSpam?: boolean
}

export interface BaileysInMemoryStore {
	chats: KeyedDB<Chat, string>
	contacts: { [id: string]: Contact }
	messages: { [jid: string]: OrderedDictionary<proto.IWebMessageInfo> }
	groupMetadata: { [jid: string]: GroupMetadata }
	state: Partial<ConnectionState>
	presences: { [id: string]: { [participant: string]: PresenceData } }
	labels: ObjectRepository<Label>
	labelAssociations: KeyedDB<LabelAssociation, string>
	bind: (ev: BaileysEventEmitter) => void
	loadMessages: (jid: string, count: number, cursor?: MessageCursor) => Promise<proto.IWebMessageInfo[]>
	loadMessage: (jidOrId: string, maybeId?: string) => Promise<proto.IWebMessageInfo | undefined>
	mostRecentMessage: (jid: string) => Promise<proto.IWebMessageInfo | undefined>
	fetchImageUrl: (jid: string, currentUrl?: string) => Promise<string | null | undefined>
	fetchGroupMetadata: (
		jid: string,
		groupMetadataFn?: (jid: string) => Promise<GroupMetadata>
	) => Promise<GroupMetadata | undefined>
	writeToFile: (path: string) => void
	readFromFile: (path: string) => void
	writeToFileInterval: (path: string, intervalMs?: number) => () => void
	toJSON: () => any
	fromJSON: (json: any) => void
	assertMessageList: (jid: string) => OrderedDictionary<proto.IWebMessageInfo>
	upsertMessage: (msg: proto.IWebMessageInfo, type?: 'append' | 'prepend') => void
}
