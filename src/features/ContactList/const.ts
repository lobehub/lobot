/** The Contacts tab. */
export const CONTACTS_URL = '/agents';
/** The contact card of an agent or group, shown beside the Contacts list. */
export const CONTACT_URL = (id: string) => `/agents/${id}`;
/** Another person's shared Agent opens the same card route as one's own. */
export const AGENT_CONTACT_URL = CONTACT_URL;
/** A person's contact card. */
export const PERSON_CONTACT_URL = (userId: string) => `/agents/people/${userId}`;
