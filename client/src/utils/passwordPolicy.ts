export const PASSWORD_RULES = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export const PASSWORD_POLICY_MESSAGE = 'Password must be at least 8 characters and include 1 number and 1 symbol.'

export function isPasswordValid(password: string) {
  return PASSWORD_RULES.test(String(password || ''))
}
