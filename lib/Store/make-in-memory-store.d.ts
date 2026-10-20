import { proto } from '../../WAProto/index.js';
import type { Chat } from '../Types/Chat.js';
import { type LabelAssociation } from '../Types/LabelAssociation.js';
import type { BaileysInMemoryStore, BaileysInMemoryStoreConfig, Comparable } from './types.js';
export declare const waChatKey: (pin?: boolean) => Comparable<Chat>;
export declare const waMessageID: (m: proto.IWebMessageInfo) => string;
export declare const waLabelAssociationKey: Comparable<LabelAssociation>;
export default function makeInMemoryStore(config?: BaileysInMemoryStoreConfig): BaileysInMemoryStore;
//# sourceMappingURL=make-in-memory-store.d.ts.map