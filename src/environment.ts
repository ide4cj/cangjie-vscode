/**
 * Merges extraEnv into a copy of the inherited environment, resolving references regardless of key order.
 * Other entries take precedence; a self-reference uses the inherited value. Inherited values stay literal.
 * Missing references stay literal; a cycle leaves the affected entry unchanged. Warnings omit values.
 */
export function expandExtraEnv(
  extra: Record<string, string>,
  inherited: NodeJS.ProcessEnv,
  warn: (message: string) => void,
): NodeJS.ProcessEnv {
  const result = { ...inherited };
  for (const key of Object.keys(extra)) {
    const missing = new Set<string>();
    const visiting = new Set<string>();
    const resolved = new Map<string, string>();
    let cycle = false;
    let missingHome = false;

    function expand(entry: string): string {
      const cached = resolved.get(entry);
      if (cached !== undefined) return cached;
      visiting.add(entry);
      const value = extra[entry];
      let expanded = value.replace(/\$\{([A-Za-z_][A-Za-z_0-9]*)\}|\$([A-Za-z_][A-Za-z_0-9]*)/g, (reference, braced, bare) => {
        const name: string = braced ?? bare;
        // PATH: "${PATH}:/tools" extends the inherited PATH rather than forming a cycle.
        if (name !== entry && Object.hasOwn(extra, name)) {
          if (visiting.has(name)) {
            cycle = true;
            return reference;
          }
          return expand(name);
        }
        const replacement = Object.hasOwn(inherited, name) ? inherited[name] : undefined;
        if (replacement !== undefined) return replacement;
        missing.add(name);
        return reference;
      });
      // Only a tilde in the configured value denotes home; inserted values stay literal.
      if (value === '~' || value.startsWith('~/') || value.startsWith('~\\')) {
        const home = inherited.HOME ?? inherited.USERPROFILE;
        if (home) expanded = home + expanded.slice(1);
        else missingHome = true;
      }
      visiting.delete(entry);
      resolved.set(entry, expanded);
      return expanded;
    }

    const expanded = expand(key);
    if (cycle) {
      warn(`cjls.server.extraEnv.${key}: cyclic extraEnv references; keeping configured value`);
    } else {
      if (missingHome) {
        warn(`cjls.server.extraEnv.${key}: HOME and USERPROFILE do not provide a home directory; keeping ~`);
      }
      if (missing.size) {
        warn(`cjls.server.extraEnv.${key}: environment variables are not set: ${[...missing].join(', ')}; keeping references`);
      }
    }
    result[key] = cycle ? extra[key] : expanded;
  }
  return result;
}
