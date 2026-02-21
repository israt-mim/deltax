/**
 * Theme utility for changing colors from UI.
 * Use setPrimaryColor() and setSecondaryColor() when implementing settings/theming.
 */

export function setPrimaryColor(hex: string) {
  document.documentElement.style.setProperty('--color-primary', hex)
  document.documentElement.style.setProperty('--color-primary-rgb', hexToRgb(hex))
}

export function setSecondaryColor(hex: string) {
  document.documentElement.style.setProperty('--color-secondary', hex)
  document.documentElement.style.setProperty('--color-secondary-rgb', hexToRgb(hex))
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : '204 85 0'
}
