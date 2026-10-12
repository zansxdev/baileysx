import { DEFAULT_CONNECTION_CONFIG } from '../Defaults/index.js';
import { makeNewsletterStatusFetcher, makeNewsletterStatusReactionSender, makeNewsletterStatusRevokeSender, makeNewsletterStatusSender, makeNewsletterStatusUpdatesFetcher } from '../Utils/newsletter-status.js';
import { makeCommunitiesSocket } from './communities.js';
// export the last socket layer
const makeWASocket = (config) => {
    const newConfig = {
        ...DEFAULT_CONNECTION_CONFIG,
        ...config
    };
    const sock = makeCommunitiesSocket(newConfig);
    sock.config = newConfig;
    sock.sendNewsletterStatus = makeNewsletterStatusSender(sock, newConfig);
    sock.sendNewsletterStatusReaction = makeNewsletterStatusReactionSender(sock);
    sock.revokeNewsletterStatus = makeNewsletterStatusRevokeSender(sock);
    sock.getNewsletterStatuses = makeNewsletterStatusFetcher(sock);
    sock.getNewsletterStatusUpdates = makeNewsletterStatusUpdatesFetcher(sock);
    return sock;
};
export default makeWASocket;
//# sourceMappingURL=index.js.map