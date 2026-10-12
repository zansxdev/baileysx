import { proto } from '../../WAProto/index.js';
import type { SocketConfig } from '../Types/index.js';
import { type BinaryNode } from '../WABinary/index.js';
export type NewsletterStatusMediaType = 'audio' | 'gif' | 'image' | 'video';
export type NewsletterStatusInteractionType = 'question' | 'question_response' | 'question_reshare';
export type NewsletterStatusContentType = 'text' | 'media' | 'reaction';
export interface NewsletterStatusSendOptions {
    messageId?: string;
    mediaHandle?: string | number;
    mediaId?: string | number;
    parentServerId?: string | number;
    responseServerId?: string | number;
    interactionType?: NewsletterStatusInteractionType;
    aiContent?: boolean;
    statusAttribution?: boolean;
    ackTimeoutMs?: number;
    resolveServerId?: boolean;
    serverIdTimeoutMs?: number;
    transport?: string;
    [key: string]: any;
}
export interface NewsletterStatusNodeInput {
    jid: string;
    message?: proto.IMessage;
    payload?: Uint8Array;
    messageId: string;
    mediaType?: NewsletterStatusMediaType;
    mediaHandle?: string | number;
    mediaId?: string | number;
    parentServerId?: string | number;
    responseServerId?: string | number;
    interactionType?: NewsletterStatusInteractionType;
    aiContent?: boolean;
}
export interface NewsletterStatusReactionNodeInput {
    jid: string;
    messageId: string;
    parentServerId: string | number;
    reaction?: string;
}
export interface NewsletterStatusRevokeNodeInput {
    jid: string;
    statusId: string;
}
export interface NewsletterStatusAck {
    class?: string;
    from?: string;
    id?: string;
    t?: number;
    serverId?: number;
    edit?: string;
    error?: string;
    applicationError?: number;
    backoff?: number;
    node: any;
}
export interface NewsletterStatusFetchOptions {
    count?: number;
    before?: string | number;
    after?: string | number;
    viewRole?: string;
}
export interface NewsletterAdminProfileInfo {
    id?: string;
    name?: string;
    pictureId?: string;
    pictureDirectPath?: string;
}
export interface NewsletterStatusEntry {
    id?: string;
    serverId?: number;
    t?: number;
    isSender: boolean;
    type?: string;
    edit?: string;
    mediaType?: NewsletterStatusMediaType;
    interactionType?: NewsletterStatusInteractionType;
    reaction?: string;
    adminProfile?: NewsletterAdminProfileInfo;
    paidPartnership: boolean;
    aiContent: boolean;
    editTimestamp?: number;
    originalTimestamp?: number;
    reactionCounts?: {
        code?: string;
        count?: number;
    }[];
    viewsCount?: number;
    responsesCount?: number;
    message?: proto.IMessage;
    node: any;
}
export interface NewsletterStatusUpdatesFetchOptions {
    count?: number;
    since?: number;
    before?: string | number;
    after?: string | number;
}
export interface NewsletterStatusList {
    jid?: string;
    t?: number;
    statuses: NewsletterStatusEntry[];
}
export type NewsletterStatusSendResult = proto.WebMessageInfo & {
    newsletterStatusServerId?: number;
    newsletterStatusAck?: NewsletterStatusAck;
    newsletterStatusResponse?: any;
    newsletterStatusDelivered?: any;
};
export interface NewsletterStatusStanzaResult {
    key: {
        remoteJid: string;
        fromMe: true;
        id: string;
    };
    status: number;
    newsletterStatusServerId?: number;
    newsletterStatusAck?: NewsletterStatusAck;
    newsletterStatusResponse?: any;
}
export declare const NEWSLETTER_STATUS_MEDIA_TYPES: Set<NewsletterStatusMediaType>;
export declare const NEWSLETTER_STATUS_WEB_MEDIA_TYPES: Set<NewsletterStatusMediaType>;
export declare const NEWSLETTER_STATUS_INTERACTIONS: Set<NewsletterStatusInteractionType>;
export declare const NEWSLETTER_STATUS_CONTENT_TYPES: Set<NewsletterStatusContentType>;
export declare const NEWSLETTER_STATUS_CALLBACK_EVENTS: string[];
export declare const NEWSLETTER_STATUS_EDIT_REACTION_REVOKE = "7";
export declare const NEWSLETTER_STATUS_EDIT_ADMIN_REVOKE = "8";
export declare const NEWSLETTER_STATUS_ACK_CLASS = "status";
export declare const NEWSLETTER_STATUS_ACK_TIMEOUT_MS = 20000;
export declare const NEWSLETTER_STATUS_SERVER_ID_TIMEOUT_MS = 8000;
export declare const NEWSLETTER_SERVER_ID_MIN = 99;
export declare const NEWSLETTER_SERVER_ID_MAX = 2147476647;
export declare const getNewsletterStatusMediaType: (message: proto.IMessage | null | undefined) => NewsletterStatusMediaType | undefined;
export declare const toNewsletterServerId: (value: string | number, label?: string) => string;
export declare const withNewsletterStatusAttribution: <T extends Record<string, any>>(content: T) => T;
export declare const parseNewsletterStatusAck: (node: any, { jid, messageId }?: {
    jid?: string;
    messageId?: string;
}) => NewsletterStatusAck;
export declare const waitForNewsletterStatusServerId: (sock: any, { jid, messageId, timeoutMs }: {
    jid?: string;
    messageId?: string;
    timeoutMs?: number;
}) => Promise<{
    serverId: number;
    node: any;
} | undefined> & {
    cancel(): void;
};
export declare const buildNewsletterAdminProfileStatusMessage: (message: proto.IMessage) => proto.Message;
export declare const buildNewsletterStatusNode: ({ jid, message, payload, messageId, mediaType, mediaId, mediaHandle, parentServerId, responseServerId, interactionType, aiContent }: NewsletterStatusNodeInput) => BinaryNode;
export declare const buildNewsletterStatusReactionNode: ({ jid, messageId, parentServerId, reaction }: NewsletterStatusReactionNodeInput) => BinaryNode;
export declare const buildNewsletterStatusRevokeNode: ({ jid, statusId }: NewsletterStatusRevokeNodeInput) => BinaryNode;
export declare const makeNewsletterStatusSender: (sock: any, config: SocketConfig) => (jid: string, content: any, options?: NewsletterStatusSendOptions) => Promise<NewsletterStatusSendResult>;
export declare const makeNewsletterStatusReactionSender: (sock: any) => (jid: string, parentServerId: string | number, reaction: string, options?: Pick<NewsletterStatusSendOptions, "messageId" | "ackTimeoutMs">) => Promise<NewsletterStatusStanzaResult>;
export declare const makeNewsletterStatusRevokeSender: (sock: any) => (jid: string, statusId: string, options?: Pick<NewsletterStatusSendOptions, "ackTimeoutMs">) => Promise<NewsletterStatusStanzaResult>;
export declare const parseNewsletterStatusesResponse: (node: any) => NewsletterStatusList;
export declare const parseNewsletterStatusUpdatesResponse: (node: any) => NewsletterStatusList;
export declare const makeNewsletterStatusFetcher: (sock: any) => (jid: string, options?: NewsletterStatusFetchOptions) => Promise<NewsletterStatusList>;
export declare const makeNewsletterStatusUpdatesFetcher: (sock: any) => (jid: string, options?: NewsletterStatusUpdatesFetchOptions) => Promise<NewsletterStatusList>;
//# sourceMappingURL=newsletter-status.d.ts.map