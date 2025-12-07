// helper for angular and other frameworks
export function pascalCase (str: string) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}


/**
 * Pluralize a word based on count
 *
 * @param word        The word to pluralize, use 'singular|plural' format for irregular plurals
 * @param count       The count to base the pluralization on
 * @param includeWord Whether to include the count in the returned string
 */
export function plural (word: string, count: number | any[], includeWord = true): string {
  const [single, plural = `${single}s`] = word.split('|')
  const value = Array.isArray(count) ? count.length : count
  const wordToUse = value === 1
    ? single
    : plural || single
  return includeWord
    ? `${value} ${wordToUse}`
    : wordToUse
}
