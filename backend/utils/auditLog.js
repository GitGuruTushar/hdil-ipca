// Writes an audit trail entry. Never allowed to break the request it's called from —
// any failure (bad ObjectId, DB hiccup, etc.) is swallowed and just logged.
async function logAudit(actorId, action, targetType, targetId, meta) {
  try {
    await require('../models/AuditLog').create({
      actor: actorId,
      action,
      targetType,
      targetId,
      meta
    });
  } catch (err) {
    console.error('Audit log write failed:', err);
  }
}

module.exports = logAudit;
