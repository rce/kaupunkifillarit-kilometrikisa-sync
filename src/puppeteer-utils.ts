import {Page, WaitForOptions} from "puppeteer";

export async function whileWaitingForNavigation<T>(page: Page, action: () => Promise<T>, waitForOptions: WaitForOptions = {}): Promise<T> {
    const navigationPromise = page.waitForNavigation(waitForOptions)
    const result = await action()
    await navigationPromise
    return result
}
