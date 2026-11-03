/** Expands extraEnv once against the inherited environment, independent of key order. */
export function expandExtraEnv(
  extra: Record<string, string>,
  inherited: NodeJS.ProcessEnv,
  warn: (message: string) => void,
): NodeJS.ProcessEnv {
  const result = { ...inherited };
  for (const [key, value] of Object.entries(extra)) {
    const missing = new Set<string>();
    let expanded = value.replace(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z_0-9]*)/g, (reference, braced, bare) => {
      const name: string = braced ?? bare;
      const replacement = inherited[name];
      if (replacement !== undefined) return replacement;
      missing.add(name);
      return reference;
    });
    // Only a tilde in the configured value denotes home; inserted values stay literal.
    if (value === '~' || value.startsWith('~/') || value.startsWith('~\\')) {
      const home = inherited.HOME ?? inherited.USERPROFILE;
      if (home) expanded = home + expanded.slice(1);
      else warn(`cjls.server.extraEnv.${key}: HOME and USERPROFILE do not provide a home directory; keeping ~`);
    }
    if (missing.size) {
      warn(`cjls.server.extraEnv.${key}: environment variables are not set: ${[...missing].join(', ')}; keeping references`);
    }
    result[key] = expanded;
  }
  return result;
}
