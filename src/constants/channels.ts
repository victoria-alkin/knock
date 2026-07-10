// The set of channels every building gets. Static for now; when we add a
// channels table these become the seed/defaults.
export type Channel = {
  key: string;
  name: string;
  emoji: string;
  description: string;
};

export const CHANNELS: Channel[] = [
  { key: 'general', name: 'General', emoji: '💬', description: 'Chat about anything in the building.' },
  { key: 'help', name: 'Help', emoji: '🆘', description: 'Ask for help or lend a hand.' },
  { key: 'events', name: 'Events', emoji: '📅', description: "See what's happening and create events." },
  { key: 'marketplace', name: 'Marketplace', emoji: '🛍️', description: 'Buy, sell, trade, or give away items.' },
  { key: 'pets', name: 'Pets', emoji: '🐾', description: 'For our furry friends and their humans.' },
  { key: 'gym', name: 'Gym', emoji: '🏋️', description: 'Work out, find partners, and gym updates.' },
  { key: 'pool', name: 'Pool', emoji: '🏊', description: 'Pool updates, meetups, and more.' },
  { key: 'sports', name: 'Sports', emoji: '⚽', description: 'Find players, teams, and watch parties.' },
  { key: 'lost-found', name: 'Lost & Found', emoji: '🔑', description: 'Post found or missing items.' },
  { key: 'building-issues', name: 'Building Issues', emoji: '🔧', description: 'Report or discuss building issues.' },
  { key: 'recommendations', name: 'Recommendations', emoji: '💡', description: 'Ask for local recs and share faves.' },
  { key: 'announcements', name: 'Announcements', emoji: '📢', description: 'Official building announcements.' },
];
