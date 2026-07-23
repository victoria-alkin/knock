// The set of channels every building gets. Static for now; when we add a
// channels table these become the seed/defaults.
export type Channel = {
  key: string;
  name: string;
  emoji: string; // fallback when no icon PNG exists
  description: string;
  color: string; // soft background tint for the channel's icon tile
  accent: string; // saturated color used to tint the channel icon
};

export const CHANNELS: Channel[] = [
  { key: 'general', name: 'General', emoji: '💬', description: 'Chat about anything in the building.', color: '#EDE7FB', accent: '#6D28D9' },
  { key: 'help', name: 'Help', emoji: '🆘', description: 'Ask for help or lend a hand.', color: '#FDE7EC', accent: '#E23E57' },
  { key: 'events', name: 'Events', emoji: '📅', description: "See what's happening and create events.", color: '#E4F6EA', accent: '#2E9E5B' },
  { key: 'marketplace', name: 'Marketplace', emoji: '🛍️', description: 'Buy, sell, trade, or give away items.', color: '#FBEEDD', accent: '#D98324' },
  { key: 'pets', name: 'Pets', emoji: '🐾', description: 'For our furry friends and their humans.', color: '#E5EDFB', accent: '#3B6FD4' },
  { key: 'gym', name: 'Gym', emoji: '🏋️', description: 'Work out, find partners, and gym updates.', color: '#EFE7FB', accent: '#7C3AED' },
  { key: 'pool', name: 'Pool', emoji: '🏊', description: 'Pool updates, meetups, and more.', color: '#E1F1FB', accent: '#2596BE' },
  { key: 'sports', name: 'Sports', emoji: '⚽', description: 'Find players, teams, and watch parties.', color: '#E4F6EA', accent: '#2E9E5B' },
  { key: 'lost-found', name: 'Lost & Found', emoji: '🔑', description: 'Post found or missing items.', color: '#FBF3DA', accent: '#C99A1E' },
  { key: 'building-issues', name: 'Building Issues', emoji: '🔧', description: 'Report or discuss building issues.', color: '#ECE9F5', accent: '#6D28D9' },
  { key: 'recommendations', name: 'Local Recs', emoji: '💡', description: 'Ask for local recs and share faves.', color: '#FBF6DA', accent: '#C99A1E' },
  { key: 'announcements', name: 'Bulletin Board', emoji: '📢', description: 'Official building announcements.', color: '#FDE7EC', accent: '#E23E57' },
];
