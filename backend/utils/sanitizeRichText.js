const sanitizeHtml = require('sanitize-html');

// Allowlist for rich-text fields (Update/Notice content, etc.) written via the
// admin WYSIWYG editor — permits basic formatting, strips scripts/handlers/iframes.
module.exports = function sanitizeRichText(html) {
  if (typeof html !== 'string') return html;
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'img'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' })
    }
  });
};
