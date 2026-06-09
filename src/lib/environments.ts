


export const getEnvVariable = (name: string, defaultVal: string): string => {
  if (!process.env || !name) return defaultVal;
  if (!(name in process.env)) {
    return defaultVal;
  }
  if (!(name in process.env)) {
    return defaultVal;
  }
  return process.env[name] as string
}