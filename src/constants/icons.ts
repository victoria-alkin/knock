// Registry of the app's PNG icons (black glyphs on transparent — tint as needed).

export const channelIcons: Record<string, number> = {
  general: require('@/assets/images/elements/icons/Channels/general.png'),
  help: require('@/assets/images/elements/icons/Channels/help.png'),
  events: require('@/assets/images/elements/icons/Channels/events.png'),
  marketplace: require('@/assets/images/elements/icons/Channels/marketplace.png'),
  pets: require('@/assets/images/elements/icons/Channels/pets.png'),
  gym: require('@/assets/images/elements/icons/Channels/gym.png'),
  pool: require('@/assets/images/elements/icons/Channels/swimming.png'),
  sports: require('@/assets/images/elements/icons/Channels/Sports.png'),
  'building-issues': require('@/assets/images/elements/icons/Channels/building issues.png'),
  recommendations: require('@/assets/images/elements/icons/Channels/building recomendations.png'),
  'lost-found': require('@/assets/images/elements/icons/Channels/lostandfound2.png'),
  announcements: require('@/assets/images/elements/icons/Channels/announcements2.png'),
};

export const tabIcons = {
  home: require('@/assets/images/elements/icons/Bottom bar/home-button.png'),
  channels: require('@/assets/images/elements/icons/Bottom bar/channels.png'),
  messages: require('@/assets/images/elements/icons/Bottom bar/messages.png'),
  profile: require('@/assets/images/elements/icons/Bottom bar/profile.png'),
  plus: require('@/assets/images/elements/icons/post plus.png'),
};

export const rsvpIcons: Record<string, number> = {
  going: require('@/assets/images/elements/icons/event rsvp/yes.png'),
  maybe: require('@/assets/images/elements/icons/event rsvp/maybe.png'),
  not_going: require('@/assets/images/elements/icons/event rsvp/no.png'),
};

export const postIcons = {
  photo: require('@/assets/images/elements/icons/post creation/add photo.png'),
  poll: require('@/assets/images/elements/icons/post creation/poll.png'),
  anonymous: require('@/assets/images/elements/icons/post creation/post anonyomus.png'),
};

export const topBarIcons = {
  addUser: require('@/assets/images/elements/icons/add user.png'),
  notification: require('@/assets/images/elements/icons/notification.png'),
};

export const likeIcons = {
  outline: require('@/assets/images/elements/icons/likes/heart.png'),
  filled: require('@/assets/images/elements/icons/likes/heart_filled.png'),
};
