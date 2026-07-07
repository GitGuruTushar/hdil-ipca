// Dependency-free CSV serializer.
// columns: array of { key, label } — key supports dot-path lookup (e.g. 'member.email').
// rows: array of plain objects or Mongoose documents (toObject/toJSON-friendly).

// Reads a possibly-nested value off an object/doc via a dot-separated path.
const getPath = (obj, path) => {
  return path.split('.').reduce((value, part) => {
    if (value === null || value === undefined) return undefined;
    return value[part];
  }, obj);
};

// Wraps a field in double quotes (doubling any internal quotes) if it contains
// a comma, quote, or newline — otherwise returns it as-is.
const escapeField = (value) => {
  if (value === null || value === undefined) return '';

  let str;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

function toCsv(rows, columns) {
  const header = columns.map((col) => escapeField(col.label)).join(',');

  const lines = rows.map((row) => {
    return columns
      .map((col) => escapeField(getPath(row, col.key)))
      .join(',');
  });

  return [header, ...lines].join('\r\n');
}

module.exports = toCsv;
