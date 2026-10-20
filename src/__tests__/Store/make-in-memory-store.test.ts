import EventEmitter from 'events'
import { existsSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { proto } from '../../WAProto/index.js'
import makeInMemoryStore from '../../Store/make-in-memory-store.js'
import { LabelAssociationType } from '../../Types/LabelAssociation.js'
import type { BaileysEventEmitter } from '../../Types/Events.js'

describe('makeInMemoryStore', () => {
	const createMockEventEmitter = (): BaileysEventEmitter => {
		const ev = new EventEmitter() as any
		ev.process = (handler: any) => handler(ev)
		return ev
	}

	it('should initialize empty store correctly', () => {
		const store = makeInMemoryStore()
		expect(store.chats.count()).toBe(0)
		expect(Object.keys(store.contacts).length).toBe(0)
		expect(Object.keys(store.messages).length).toBe(0)
		expect(store.state.connection).toBe('close')
	})

	it('should handle messages.upsert and flexible message lookups', async () => {
		const ev = createMockEventEmitter()
		const store = makeInMemoryStore()
		store.bind(ev)

		const testMsg1: proto.IWebMessageInfo = {
			key: {
				remoteJid: '1234567890@s.whatsapp.net',
				id: 'MSG001',
				fromMe: false
			},
			message: { conversation: 'Hello World 1' },
			messageTimestamp: 1000
		}

		const testMsg2: proto.IWebMessageInfo = {
			key: {
				remoteJid: '1234567890@s.whatsapp.net',
				id: 'MSG002',
				fromMe: true
			},
			message: { conversation: 'Hello World 2' },
			messageTimestamp: 1001
		}

		const testMsg3: proto.IWebMessageInfo = {
			key: {
				remoteJid: '1234567890@s.whatsapp.net',
				id: 'MSG003',
				fromMe: false
			},
			message: { conversation: 'Hello World 3' },
			messageTimestamp: 1002
		}

		ev.emit('messages.upsert', {
			messages: [testMsg1, testMsg2, testMsg3],
			type: 'notify'
		})

		const jid = '1234567890@s.whatsapp.net'

		// 1. Check loadMessage with (jid, id)
		const loaded1 = await store.loadMessage(jid, 'MSG001')
		expect(loaded1).toBeDefined()
		expect(loaded1?.key.id).toBe('MSG001')

		// 2. Check flexible loadMessage with only (id)
		const loaded2 = await store.loadMessage('MSG002')
		expect(loaded2).toBeDefined()
		expect(loaded2?.key.id).toBe('MSG002')

		// 3. Check loadMessages list
		const msgs = await store.loadMessages(jid, 10)
		expect(msgs.length).toBe(3)

		// 4. Cursor before
		const beforeMsgs = await store.loadMessages(jid, 1, { before: 'MSG002' })
		expect(beforeMsgs.length).toBe(1)
		expect(beforeMsgs[0]?.key.id).toBe('MSG001')

		// 5. Cursor after
		const afterMsgs = await store.loadMessages(jid, 1, { after: 'MSG002' })
		expect(afterMsgs.length).toBe(1)
		expect(afterMsgs[0]?.key.id).toBe('MSG003')

		// 6. Check OrderedDictionary methods and Proxy access
		const chatMsgs = store.messages[jid]
		expect(chatMsgs).toBeDefined()
		expect(chatMsgs.get('MSG001')).toBeDefined()
		// Proxy property access dict[id]
		expect(chatMsgs['MSG001']?.key?.id).toBe('MSG001')
		// Proxy index access dict[0]
		expect(chatMsgs[0]?.key?.id).toBe('MSG001')
		// Array length
		expect(chatMsgs.length).toBe(3)
		// Iteration
		const ids: string[] = []
		for (const m of chatMsgs) {
			if (m.key.id) ids.push(m.key.id)
		}
		expect(ids).toEqual(['MSG001', 'MSG002', 'MSG003'])

		// 7. mostRecentMessage
		const recent = await store.mostRecentMessage(jid)
		expect(recent?.key.id).toBe('MSG003')
	})

	it('should respect maxMessagesPerChat limit and evict oldest messages', async () => {
		const store = makeInMemoryStore({ maxMessagesPerChat: 3 })
		const jid = 'limit-test@s.whatsapp.net'

		for (let i = 1; i <= 5; i++) {
			store.upsertMessage({
				key: { remoteJid: jid, id: `MSG_${i}`, fromMe: false },
				message: { conversation: `Test ${i}` },
				messageTimestamp: 1000 + i
			})
		}

		expect(store.messages[jid]?.length).toBe(3)
		expect(store.messages[jid]?.get('MSG_1')).toBeUndefined()
		expect(store.messages[jid]?.get('MSG_2')).toBeUndefined()
		expect(store.messages[jid]?.get('MSG_3')).toBeDefined()
		expect(store.messages[jid]?.get('MSG_4')).toBeDefined()
		expect(store.messages[jid]?.get('MSG_5')).toBeDefined()
	})

	it('should filter spam/oversized jpegThumbnail when filterSpam is enabled', () => {
		const store = makeInMemoryStore({ filterSpam: true })
		const jid = 'spam-test@s.whatsapp.net'

		const heavyMsg: proto.IWebMessageInfo = {
			key: { remoteJid: jid, id: 'HEAVY_1', fromMe: false },
			message: {
				imageMessage: {
					caption: 'Spam pic',
					jpegThumbnail: Buffer.from('large-fake-thumbnail-data') as any
				} as any
			}
		}

		store.upsertMessage(heavyMsg)
		const saved = store.messages[jid]?.get('HEAVY_1')
		expect((saved?.message as any)?.imageMessage?.jpegThumbnail).toBeUndefined()
	})

	it('should handle messages.update and messages.delete', async () => {
		const ev = createMockEventEmitter()
		const store = makeInMemoryStore()
		store.bind(ev)

		const jid = '1234567890@s.whatsapp.net'
		const testMsg: proto.IWebMessageInfo = {
			key: {
				remoteJid: jid,
				id: 'MSG_DEL_TEST',
				fromMe: false
			},
			message: { conversation: 'Before edit' }
		}

		store.upsertMessage(testMsg)
		expect(await store.loadMessage(jid, 'MSG_DEL_TEST')).toBeDefined()

		// Update message
		ev.emit('messages.update', [
			{
				key: { remoteJid: jid, id: 'MSG_DEL_TEST' },
				update: { message: { conversation: 'After edit' } }
			}
		])

		const updated = await store.loadMessage(jid, 'MSG_DEL_TEST')
		expect((updated?.message as any)?.conversation).toBe('After edit')

		// Delete single message by keys
		ev.emit('messages.delete', {
			keys: [{ remoteJid: jid, id: 'MSG_DEL_TEST', fromMe: false }]
		})

		const deleted = await store.loadMessage(jid, 'MSG_DEL_TEST')
		expect(deleted).toBeUndefined()

		// Delete all messages in chat
		store.upsertMessage({
			key: { remoteJid: jid, id: 'MSG_ALL_1', fromMe: false },
			message: { conversation: '1' }
		})
		store.upsertMessage({
			key: { remoteJid: jid, id: 'MSG_ALL_2', fromMe: false },
			message: { conversation: '2' }
		})
		expect(store.messages[jid]?.length).toBe(2)

		ev.emit('messages.delete', { all: true, jid })
		expect(store.messages[jid]?.length).toBe(0)
	})

	it('should handle contacts, chats, presences and labels events', () => {
		const ev = createMockEventEmitter()
		const store = makeInMemoryStore()
		store.bind(ev)

		const userJid = '6281234567@s.whatsapp.net'

		// Contacts upsert & update
		ev.emit('contacts.upsert', [{ id: userJid, name: 'Alice' }])
		expect(store.contacts[userJid]?.name).toBe('Alice')

		ev.emit('contacts.update', [{ id: userJid, notify: 'AliceNotify' }])
		expect(store.contacts[userJid]?.notify).toBe('AliceNotify')

		// Chats upsert, update, delete
		ev.emit('chats.upsert', [{ id: userJid, unreadCount: 1, conversationTimestamp: 500 }])
		expect(store.chats.get(userJid)?.unreadCount).toBe(1)

		ev.emit('chats.update', [{ id: userJid, unreadCount: 0 }])
		expect(store.chats.get(userJid)?.unreadCount).toBe(0)

		// Presence update
		ev.emit('presence.update', { id: userJid, presences: { [userJid]: { lastKnownPresence: 'available' } } })
		expect(store.presences[userJid]?.[userJid]?.lastKnownPresence).toBe('available')

		// Labels edit & association
		ev.emit('labels.edit', { id: 'label_1', name: 'VIP', color: 1, deleted: false })
		expect(store.labels.findById('label_1')?.name).toBe('VIP')

		ev.emit('labels.association', {
			type: 'add',
			association: { type: LabelAssociationType.Chat, chatId: userJid, labelId: 'label_1' }
		})
		expect(store.labelAssociations.count()).toBe(1)

		ev.emit('labels.association', {
			type: 'remove',
			association: { type: LabelAssociationType.Chat, chatId: userJid, labelId: 'label_1' }
		})
		expect(store.labelAssociations.count()).toBe(0)

		ev.emit('labels.edit', { id: 'label_1', name: 'VIP', color: 1, deleted: true })
		expect(store.labels.findById('label_1')).toBeUndefined()

		// Chats delete
		ev.emit('chats.delete', [userJid])
		expect(store.chats.get(userJid)).toBeUndefined()
	})

	it('should handle group-participants.update and fetchGroupMetadata', async () => {
		const ev = createMockEventEmitter()
		let mockCallCount = 0
		const mockSocket = {
			groupMetadata: async (id: string) => {
				mockCallCount++
				return {
					id,
					subject: 'Mock Group',
					participants: [{ id: '628999@s.whatsapp.net', admin: null }]
				}
			}
		}
		const store = makeInMemoryStore({ socket: mockSocket as any })
		store.bind(ev)

		const groupId = '123456-group@g.us'
		store.groupMetadata[groupId] = {
			id: groupId,
			subject: 'Test Group',
			owner: '628111@s.whatsapp.net',
			participants: [
				{ id: '628111@s.whatsapp.net', admin: 'superadmin' } as any
			]
		} as any

		// Add participant
		ev.emit('group-participants.update', {
			id: groupId,
			author: '628111@s.whatsapp.net',
			participants: [{ id: '628222@s.whatsapp.net', admin: null }] as any,
			action: 'add'
		})
		expect(store.groupMetadata[groupId]?.participants.length).toBe(2)

		// Promote participant
		ev.emit('group-participants.update', {
			id: groupId,
			author: '628111@s.whatsapp.net',
			participants: [{ id: '628222@s.whatsapp.net', admin: null }] as any,
			action: 'promote'
		})
		const promoted = store.groupMetadata[groupId]?.participants.find(p => p.id === '628222@s.whatsapp.net')
		expect(promoted?.admin).toBe('admin')

		// Demote participant
		ev.emit('group-participants.update', {
			id: groupId,
			author: '628111@s.whatsapp.net',
			participants: [{ id: '628222@s.whatsapp.net', admin: 'admin' }] as any,
			action: 'demote'
		})
		const demoted = store.groupMetadata[groupId]?.participants.find(p => p.id === '628222@s.whatsapp.net')
		expect(demoted?.admin).toBeNull()

		// Remove participant
		ev.emit('group-participants.update', {
			id: groupId,
			author: '628111@s.whatsapp.net',
			participants: [{ id: '628222@s.whatsapp.net', admin: null }] as any,
			action: 'remove'
		})
		expect(store.groupMetadata[groupId]?.participants.length).toBe(1)

		// fetchGroupMetadata with socket fallback and cache
		const fetched = await store.fetchGroupMetadata('mock-group@g.us')
		expect(fetched?.subject).toBe('Mock Group')
		expect(mockCallCount).toBe(1)

		// Second call should come from cache
		const fetchedAgain = await store.fetchGroupMetadata('mock-group@g.us')
		expect(fetchedAgain?.subject).toBe('Mock Group')
		expect(mockCallCount).toBe(1)
	})

	it('should serialize to JSON and restore from file correctly', async () => {
		const store1 = makeInMemoryStore()
		const jid = '628999@s.whatsapp.net'

		store1.contacts[jid] = { id: jid, name: 'Zans' }
		store1.chats.upsert({ id: jid, name: 'Zans Chat', conversationTimestamp: 123456 })
		store1.upsertMessage({
			key: { remoteJid: jid, id: 'PERSIST_MSG', fromMe: false },
			message: { conversation: 'Persistent message' }
		})

		const filePath = join(tmpdir(), `test_store_${Date.now()}.json`)

		store1.writeToFile(filePath)
		expect(existsSync(filePath)).toBe(true)

		const store2 = makeInMemoryStore()
		store2.readFromFile(filePath)

		expect(store2.contacts[jid]?.name).toBe('Zans')
		expect(store2.chats.get(jid)?.name).toBe('Zans Chat')
		const restoredMsg = await store2.loadMessage(jid, 'PERSIST_MSG')
		expect(restoredMsg).toBeDefined()
		expect((restoredMsg?.message as any)?.conversation).toBe('Persistent message')

		// Auto save interval helper
		const stopInterval = store2.writeToFileInterval(filePath, 5000)
		expect(typeof stopInterval).toBe('function')
		stopInterval()

		// Cleanup
		try {
			unlinkSync(filePath)
		} catch {}
	})
})
