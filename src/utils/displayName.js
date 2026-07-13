// Resolves what to actually show for another user: the viewer's own private
// nickname override if they've set one, otherwise the person's real name.
// `user` can be a populated user object/subdocument or a plain id string.
export function getDisplayName(user, nicknames) {
  if (!user) return "";
  const id = typeof user === "string" ? user : user._id;
  const nick = nicknames?.[id];
  if (nick) return nick;
  if (typeof user === "string") return "";
  return user.fullName || user.username || "Member";
}
