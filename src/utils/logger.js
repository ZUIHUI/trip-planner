const isDev = Boolean(import.meta.env?.DEV);

const callConsole = (method, args) => {
  if (!isDev) return;
  const target = console[method] || console.log;
  target(...args);
};

export const logger = {
  debug: (...args) => callConsole('debug', args),
  info: (...args) => callConsole('info', args),
  warn: (...args) => callConsole('warn', args),
  error: (...args) => callConsole('error', args)
};
