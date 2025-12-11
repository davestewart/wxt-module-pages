export default defineBackground({
  main () {
    const url = browser.runtime.getURL('/index.html')
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0]) {
        browser.tabs.update(tabs[0].id!, { url })
      }
    })
  },
})
