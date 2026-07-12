// The set of channels every building gets. Static for now; when we add a
// channels table these become the seed/defaults.
export type Channel = {
  key: string;
  name: string;
  emoji: string;
  description: string;
  color: string; // soft background tint for the channel's icon tile
};

export const CHANNELS: Channel[] = [
  { key: 'general', name: 'General', emoji: '💬', description: 'Chat about anything in the building.', color: '#EDE7FB' },
  { key: 'help', name: 'Help', emoji: '🆘', description: 'Ask for help or lend a hand.', color: '#FDE7EC' },
  { key: 'events', name: 'Events', emoji: '📅', description: "See what's happening and create events.", color: '#E4F6EA' },
  { key: 'marketplace', name: 'Marketplace', emoji: '🛍️', description: 'Buy, sell, trade, or give away items.', color: '#FBEEDD' },
  { key: 'pets', name: 'Pets', emoji: '🐾', description: 'For our furry friends and their humans.', color: '#E5EDFB' },
  { key: 'gym', name: 'Gym', emoji: '🏋️', description: 'Work out, find partners, and gym updates.', color: '#EFE7FB' },
  { key: 'pool', name: 'Pool', emoji: '🏊', description: 'Pool updates, meetups, and more.', color: '#E1F1FB' },
  { key: 'sports', name: 'Sports', emoji: '⚽', description: 'Find players, teams, and watch parties.', color: '#E4F6EA' },
  { key: 'lost-found', name: 'Lost & Found', emoji: '🔑', description: 'Post found or missing items.', color: '#FBF3DA' },
  { key: 'building-issues', name: 'Building Issues', emoji: '🔧', description: 'Report or discuss building issues.', color: '#ECE9F5' },
  { key: 'recommendations', name: 'Recommendations', emoji: '💡', description: 'Ask for local recs and share faves.', color: '#FBF6DA' },
  { key: 'announcements', name: 'Announcements', emoji: '📢', description: 'Official building announcements.', color: '#FDE7EC' },
];
