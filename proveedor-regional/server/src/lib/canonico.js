import crypto from 'node:crypto';

// JSON con las claves ordenadas, para que el hash no dependa del orden en que Postgres devuelve un JSONB.
export function jsonCanonico(valor) {
  if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(',')}]`;
  if (valor && typeof valor === 'object') {
    return `{${Object.keys(valor)
      .sort()
      .filter((k) => valor[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${jsonCanonico(valor[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(valor ?? null);
}

export function hashSha256(valor) {
  return crypto.createHash('sha256').update(jsonCanonico(valor)).digest('hex');
}
