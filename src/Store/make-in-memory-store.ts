import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { proto } from '../../WAProto/index.js'
import { DEFAULT_CONNECTION_CONFIG } from '../Defaults/index.js'
import type { Chat, PresenceData } from '../Types/Chat.js'
import type { Contact } from '../Types/Contact.js'
import type { BaileysEventEmitter } from '../Types/Events.js'
import type { GroupMetadata } from '../Types/GroupMetadata.js'
import type { Label } from '../Types/Label.js'
import { type LabelAssociation, LabelAssociationType } from '../Types/LabelAssociation.js'
import type { ConnectionState } from '../Types/State.js'
import { toNumber } from '../Utils/generics.js'
import { jidNormalizedUser } from '../WABinary/jid-utils.js'
import KeyedDB from './keyed-db.js'
import makeOrderedDictionary, { type OrderedDictionary } from './make-ordered-dictionary.js'
import ObjectRepository from './object-repository.js'
import type {
	BaileysInMemoryStore,
	BaileysInMemoryStoreConfig,
	Comparable,
	MessageCursor
} from './types.js'

export const waChatKey = (pin = true): Comparable<Chat> => ({
	key: (c: Chat) =>
		(pin ? (c.pinned ? '1' : '0') : '') +
		(c.archived ? '0' : '1') +
		(c.conversationTimestamp
			? toNumber(c.conversationTimestamp).toString(16).padStart(8, '0')
			: '') +
		(c.id || ''),
	compare: (k1: string, k2: string) => k2.localeCompare(k1)
})

export const waMessageID = (m: proto.IWebMessageInfo) => m.key?.id || ''

export const waLabelAssociationKey: Comparable<LabelAssociation> = {
	key: (la: LabelAssociation) =>
		la.type === LabelAssociationType.Chat
			? la.chatId + la.labelId
			: la.chatId + la.messageId + la.labelId,
	compare: (k1: string, k2: string) => k2.localeCompare(k1)
}

export default function makeInMemoryStore(
	config: BaileysInMemoryStoreConfig = {}
): BaileysInMemoryStore {
	const socket = config.socket
	const chatKey = config.chatKey || waChatKey(true)
	const labelAssociationKey = config.labelAssociationKey || waLabelAssociationKey
	const logger =
		config.logger ||
		DEFAULT_CONNECTION_CONFIG.logger.child({
			stream: 'in-mem-store'
		})
	const maxMessagesPerChat = config.maxMessagesPerChat

	const chats = new KeyedDB<Chat, string>(chatKey.compare, chatKey.key)
	const messages: { [jid: string]: OrderedDictionary<proto.IWebMessageInfo> } = {}
	const contacts: { [id: string]: Contact } = {}
	const groupMetadata: { [jid: string]: GroupMetadata } = {}
	const presences: { [id: string]: { [participant: string]: PresenceData } } = {}
	const state: Partial<ConnectionState> = { connection: 'close' }
	const labels = new ObjectRepository<Label>()
	const labelAssociations = new KeyedDB<LabelAssociation, string>(
		labelAssociationKey.compare,
		labelAssociationKey.key
	)

	const assertMessageList = (jid: string) => {
		const normJid = jidNormalizedUser(jid)
		if (!messages[normJid]) {
			messages[normJid] = makeOrderedDictionary(waMessageID, maxMessagesPerChat)
		}

		return messages[normJid]!
	}

	const contactsUpsert = (newContacts: Contact[]) => {
		const oldContacts = new Set(Object.keys(contacts))
		for (const contact of newContacts) {
			if (contact.id) {
				oldContacts.delete(contact.id)
				contacts[contact.id] = Object.assign(contacts[contact.id] || {}, contact)
			}
		}

		return oldContacts
	}

	const labelsUpsert = (newLabels: Label[]) => {
		for (const label of newLabels) {
			if (label.id) {
				labels.upsertById(label.id, label)
			}
		}
	}

	const sanitizeMessage = (msg: proto.IWebMessageInfo): proto.IWebMessageInfo => {
		if (!config.filterSpam || !msg || typeof msg !== 'object') {
			return msg
		}

		try {
			const m = msg.message as any
			if (m) {
				for (const k of Object.keys(m)) {
					if (m[k] && typeof m[k] === 'object') {
						if (m[k].jpegThumbnail) {
							delete m[k].jpegThumbnail
						}

						if (m[k].contextInfo?.quotedMessage) {
							const qm = m[k].contextInfo.quotedMessage
							for (const qk of Object.keys(qm)) {
								if (qm[qk]?.jpegThumbnail) {
									delete qm[qk].jpegThumbnail
								}
							}
						}
					}
				}
			}
		} catch {}

		return msg
	}

	const upsertMessage = (msg: proto.IWebMessageInfo, type: 'append' | 'prepend' = 'append') => {
		const rawJid = msg.key?.remoteJid
		if (!rawJid) return

		const jid = jidNormalizedUser(rawJid)
		const cleanMsg = sanitizeMessage(msg)
		const list = assertMessageList(jid)
		list.upsert(cleanMsg, type)

		const chat = chats.get(jid)
		const ts = toNumber(cleanMsg.messageTimestamp)
		if (!chat) {
			chats.insert({
				id: jid,
				conversationTimestamp: ts,
				unreadCount: 0
			})
		} else if (ts && (!chat.conversationTimestamp || ts > toNumber(chat.conversationTimestamp))) {
			chats.update(jid, c => {
				c.conversationTimestamp = ts
			})
		}
	}

	const bind = (ev: BaileysEventEmitter) => {
		ev.on('connection.update', update => {
			Object.assign(state, update)
		})

		ev.on(
			'messaging-history.set',
			({ chats: newChats, contacts: newContacts, messages: newMessages, isLatest, syncType }) => {
				if (syncType === proto.HistorySync.HistorySyncType.ON_DEMAND) {
					return
				}

				if (isLatest) {
					chats.clear()
					for (const id in messages) {
						delete messages[id]
					}
				}

				if (newChats) {
					chats.insertIfAbsent(...newChats)
				}

				if (newContacts) {
					const oldContacts = contactsUpsert(newContacts)
					if (isLatest) {
						for (const jid of oldContacts) {
							delete contacts[jid]
						}
					}
				}

				if (newMessages) {
					for (const msg of newMessages) {
						const rawJid = msg.key?.remoteJid
						if (rawJid) {
							const jid = jidNormalizedUser(rawJid)
							const list = assertMessageList(jid)
							list.upsert(sanitizeMessage(msg), 'prepend')
						}
					}
				}
			}
		)

		ev.on('contacts.upsert', contactsUpsert)

		ev.on('contacts.update', updates => {
			for (const update of updates) {
				if (update.id && contacts[update.id]) {
					Object.assign(contacts[update.id]!, update)
				}
			}
		})

		ev.on('chats.upsert', newChats => {
			chats.upsert(...newChats)
		})

		ev.on('chats.update', updates => {
			for (const update of updates) {
				if (update.id) {
					chats.update(update.id, chat => Object.assign(chat, update))
				}
			}
		})

		ev.on('chats.delete', deletions => {
			for (const item of deletions) {
				chats.deleteById(item)
			}
		})

		ev.on('groups.update', updates => {
			for (const update of updates) {
				if (update.id) {
					if (groupMetadata[update.id]) {
						Object.assign(groupMetadata[update.id]!, update)
					}

					chats.update(update.id, chat => {
						if (update.subject) {
							chat.name = update.subject
						}
					})
				}
			}
		})

		ev.on('group-participants.update', ({ id, participants, action }) => {
			const metadata = groupMetadata[id]
			if (metadata) {
				const participantIds = new Set(
					participants.map(p => (typeof p === 'string' ? p : p.id))
				)
				switch (action) {
					case 'add':
						for (const p of participants) {
							const pId = typeof p === 'string' ? p : p.id
							if (!metadata.participants.some(existing => existing.id === pId)) {
								metadata.participants.push(
									typeof p === 'object' && p !== null
										? p
										: ({ id: pId, admin: null } as any)
								)
							}
						}

						break
					case 'demote':
					case 'promote':
						for (const participant of metadata.participants) {
							if (participantIds.has(participant.id)) {
								participant.admin = action === 'promote' ? 'admin' : null
							}
						}

						break
					case 'remove':
						metadata.participants = metadata.participants.filter(
							p => !participantIds.has(p.id)
						)
						break
				}
			}
		})

		ev.on('labels.edit', label => {
			if (label.deleted) {
				labels.deleteById(label.id)
			} else {
				labels.upsertById(label.id, label)
			}
		})

		ev.on('labels.association', ({ type, association }) => {
			if (type === 'add') {
				labelAssociations.upsert(association)
			} else if (type === 'remove') {
				labelAssociations.deleteById(labelAssociationKey.key(association))
			}
		})

		ev.on('presence.update', ({ id, presences: update }) => {
			presences[id] = presences[id] || {}
			Object.assign(presences[id]!, update)
		})

		ev.on('messages.upsert', ({ messages: newMessages, type }) => {
			if (type !== 'append' && type !== 'notify') {
				return
			}

			for (const msg of newMessages) {
				const rawJid = msg.key?.remoteJid
				if (!rawJid) continue

				const jid = jidNormalizedUser(rawJid)
				const cleanMsg = sanitizeMessage(msg)
				const list = assertMessageList(jid)
				list.upsert(cleanMsg, 'append')

				const chat = chats.get(jid)
				const ts = toNumber(cleanMsg.messageTimestamp)
				if (!chat) {
					if (type === 'notify') {
						ev.emit('chats.upsert', [
							{
								id: jid,
								conversationTimestamp: ts,
								unreadCount: 1
							}
						])
					}
				} else if (ts && (!chat.conversationTimestamp || ts > toNumber(chat.conversationTimestamp))) {
					chats.update(jid, c => {
						c.conversationTimestamp = ts
					})
				}
			}
		})

		ev.on('messages.update', updates => {
			for (const { update, key } of updates) {
				const rawJid = key?.remoteJid
				if (!rawJid) continue

				const jid = jidNormalizedUser(rawJid)
				const list = assertMessageList(jid)
				if (key.id) {
					list.updateAssign(key.id, update)
				}
			}
		})

		ev.on('messages.delete', item => {
			if ('all' in item) {
				const jid = item.jid ? jidNormalizedUser(item.jid) : undefined
				if (jid && messages[jid]) {
					messages[jid]!.clear()
				}
			} else if (item.keys?.length) {
				const rawJid = item.keys[0]?.remoteJid
				const jid = rawJid ? jidNormalizedUser(rawJid) : undefined
				if (jid && messages[jid]) {
					const idSet = new Set(item.keys.map(k => k.id))
					messages[jid]!.filter(m => !m.key?.id || !idSet.has(m.key.id))
				}
			}
		})
	}

	const toJSON = () => ({
		chats: chats.all(),
		contacts,
		messages: Object.fromEntries(
			Object.entries(messages).map(([jid, list]) => [jid, list.toJSON()])
		),
		labels: labels.findAll(),
		labelAssociations: labelAssociations.all(),
		groupMetadata
	})

	const fromJSON = (json: any) => {
		if (!json || typeof json !== 'object') return

		if (Array.isArray(json.chats)) {
			chats.upsert(...json.chats)
		}

		if (Array.isArray(json.labelAssociations)) {
			labelAssociations.upsert(...json.labelAssociations)
		}

		if (json.contacts && typeof json.contacts === 'object') {
			contactsUpsert(Object.values(json.contacts))
		}

		if (Array.isArray(json.labels)) {
			labelsUpsert(json.labels)
		} else if (json.labels && typeof json.labels === 'object') {
			labelsUpsert(Object.values(json.labels))
		}

		if (json.groupMetadata && typeof json.groupMetadata === 'object') {
			Object.assign(groupMetadata, json.groupMetadata)
		}

		if (json.messages && typeof json.messages === 'object') {
			for (const jid in json.messages) {
				const list = assertMessageList(jid)
				const msgs = json.messages[jid]
				if (Array.isArray(msgs)) {
					for (const msg of msgs) {
						list.upsert(proto.WebMessageInfo.fromObject(msg), 'append')
					}
				}
			}
		}
	}

	const loadMessage = async (
		jidOrId: string,
		maybeId?: string
	): Promise<proto.IWebMessageInfo | undefined> => {
		if (maybeId) {
			const jid = jidNormalizedUser(jidOrId)
			return messages[jid]?.get(maybeId)
		}

		const targetId = jidOrId
		if (!targetId) return undefined

		for (const jid of Object.keys(messages)) {
			const msg = messages[jid]?.get(targetId)
			if (msg) return msg
		}

		return undefined
	}

	const loadMessages = async (
		jid: string,
		count: number,
		cursor?: MessageCursor
	): Promise<proto.IWebMessageInfo[]> => {
		const list = assertMessageList(jid)
		const mode = !cursor || 'before' in cursor ? 'before' : 'after'
		let id: string | undefined

		if (cursor) {
			const rawCursor = 'before' in cursor ? cursor.before : cursor.after
			if (typeof rawCursor === 'string') {
				id = rawCursor
			} else if (rawCursor && typeof rawCursor === 'object' && rawCursor.id) {
				id = rawCursor.id
			}
		}

		const idx = id ? list.array.findIndex(i => i.key?.id === id) : -1
		if (idx <= -1) {
			return list.array.slice(-count)
		}

		if (mode === 'before') {
			let cursorIdx = idx - count
			if (cursorIdx < 0) {
				cursorIdx = 0
			}

			return list.array.slice(cursorIdx, idx)
		} else {
			return list.array.slice(idx + 1, idx + 1 + count)
		}
	}

	const mostRecentMessage = async (jid: string): Promise<proto.IWebMessageInfo | undefined> => {
		const message = messages[jidNormalizedUser(jid)]?.array.slice(-1)
		return message?.[0]
	}

	const fetchImageUrl = async (
		jid: string,
		currentUrl?: string
	): Promise<string | null | undefined> => {
		const contact = contacts[jid]
		if (!contact) {
			return socket?.profilePictureUrl ? await socket.profilePictureUrl(jid) : currentUrl
		}

		if (typeof contact.imgUrl === 'undefined') {
			contact.imgUrl = socket?.profilePictureUrl
				? await socket.profilePictureUrl(jid)
				: currentUrl
		}

		return contact.imgUrl
	}

	const fetchGroupMetadata = async (
		jid: string,
		groupMetadataFn?: (jid: string) => Promise<GroupMetadata>
	): Promise<GroupMetadata | undefined> => {
		if (!groupMetadata[jid]) {
			const fetcher =
				groupMetadataFn ||
				(socket?.groupMetadata ? (id: string) => socket.groupMetadata(id) : undefined)
			if (fetcher) {
				const metadata = await fetcher(jid)
				groupMetadata[jid] = metadata
			}
		}

		return groupMetadata[jid]
	}

	const writeToFile = (filePath: string) => {
		try {
			const dir = dirname(filePath)
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true })
			}

			const tmpPath = `${filePath}.tmp`
			writeFileSync(tmpPath, JSON.stringify(toJSON()))
			renameSync(tmpPath, filePath)
		} catch (err) {
			logger.error({ err }, 'failed to write store to file')
		}
	}

	const readFromFile = (filePath: string) => {
		if (!existsSync(filePath)) return

		try {
			const jsonStr = readFileSync(filePath, { encoding: 'utf-8' })
			if (!jsonStr) return

			const json = JSON.parse(jsonStr)
			fromJSON(json)
		} catch (err) {
			logger.error({ err }, 'failed to read store from file')
		}
	}

	const writeToFileInterval = (filePath: string, intervalMs = 10_000) => {
		readFromFile(filePath)
		const interval = setInterval(() => writeToFile(filePath), intervalMs)
		return () => clearInterval(interval)
	}

	return {
		chats,
		contacts,
		messages,
		groupMetadata,
		state,
		presences,
		labels,
		labelAssociations,
		bind,
		loadMessages,
		loadMessage,
		mostRecentMessage,
		fetchImageUrl,
		fetchGroupMetadata,
		writeToFile,
		readFromFile,
		writeToFileInterval,
		toJSON,
		fromJSON,
		assertMessageList,
		upsertMessage
	}
}
