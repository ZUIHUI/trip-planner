const noCorrection = {
  autoCorrect: 'off',
  spellCheck: false
};

export const emailInputProps = {
  type: 'email',
  inputMode: 'email',
  autoComplete: 'email',
  autoCapitalize: 'none',
  ...noCorrection,
  enterKeyHint: 'next'
};

export const codeInputProps = {
  type: 'text',
  inputMode: 'numeric',
  pattern: '[0-9]*',
  maxLength: 6,
  autoComplete: 'one-time-code',
  autoCapitalize: 'none',
  ...noCorrection,
  enterKeyHint: 'done'
};

export const inviteCodeInputProps = {
  type: 'text',
  inputMode: 'text',
  maxLength: 9,
  autoComplete: 'off',
  autoCapitalize: 'characters',
  ...noCorrection,
  enterKeyHint: 'go'
};

export const searchInputProps = {
  type: 'search',
  inputMode: 'search',
  autoComplete: 'off',
  autoCapitalize: 'none',
  ...noCorrection,
  enterKeyHint: 'search'
};

export const moneyInputProps = {
  type: 'text',
  inputMode: 'decimal',
  autoComplete: 'off',
  autoCapitalize: 'none',
  ...noCorrection,
  enterKeyHint: 'done'
};

export const integerInputProps = {
  type: 'text',
  inputMode: 'numeric',
  pattern: '[0-9]*',
  autoComplete: 'off',
  autoCapitalize: 'none',
  ...noCorrection,
  enterKeyHint: 'done'
};

export const urlInputProps = {
  type: 'url',
  inputMode: 'url',
  autoComplete: 'url',
  autoCapitalize: 'none',
  ...noCorrection,
  enterKeyHint: 'done'
};

export const plainTextInputProps = {
  type: 'text',
  autoComplete: 'off',
  ...noCorrection,
  enterKeyHint: 'next'
};
