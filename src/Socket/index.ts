import { DEFAULT_CONNECTION_CONFIG } from '../Defaults'
import type { UserFacingSocketConfig } from '../Types'
import {
	makeNewsletterStatusFetcher,
	makeNewsletterStatusReactionSender,
	makeNewsletterStatusRevokeSender,
	makeNewsletterStatusSender,
	makeNewsletterStatusUpdatesFetcher
} from '../Utils/newsletter-status'
import { makeCommunitiesSocket } from './communities'

// export the last socket layer
const makeWASocket = (config: UserFacingSocketConfig) => {
	const newConfig = {
		...DEFAULT_CONNECTION_CONFIG,
		...config
	}

	const sock = makeCommunitiesSocket(newConfig)
	;(sock as any).config = newConfig
	;(sock as any).sendNewsletterStatus = makeNewsletterStatusSender(sock, newConfig)
	;(sock as any).sendNewsletterStatusReaction = makeNewsletterStatusReactionSender(sock)
	;(sock as any).revokeNewsletterStatus = makeNewsletterStatusRevokeSender(sock)
	;(sock as any).getNewsletterStatuses = makeNewsletterStatusFetcher(sock)
	;(sock as any).getNewsletterStatusUpdates = makeNewsletterStatusUpdatesFetcher(sock)
	return sock
}

export default makeWASocket

