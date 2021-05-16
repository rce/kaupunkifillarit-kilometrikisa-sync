import {ElementHandle, Page} from "puppeteer";
import {whileWaitingForNavigation} from "./puppeteer-utils";
import {DateTime} from "luxon";

export type Submission = {
    date: DateTime
    km: number
    minutes: number
}

export async function submitKaupunkifillariStats(page: Page, submissions: Map<string, Submission>, username: string, password: string): Promise<void> {
    await login(page, username, password)
    await whileWaitingForNavigation(page, () =>
        page.click("aria/Kirjaa kilometrisi"))

    await enterDistances(page, submissions)
    await enterDurations(page, submissions)
    await page.waitForTimeout(1000)
}

async function login(page: Page, username: string, password: string) {
    await page.goto("https://www.kilometrikisa.fi/accounts/login/")
    await page.type("aria/Oma käyttäjätunnuksesi", username)
    await page.type("aria/Salasana", password)
    await whileWaitingForNavigation(page, () =>
        page.click("aria/Kirjaudu"))
}

async function enterDistances(page: Page, submissions: Map<string, Submission>): Promise<void> {
    for (const form of await page.$$("form[class=km-log-form]")) {
        const date = await form.$eval("input[name=km_date]", e => e.getAttribute("value"))
        if (!date) throw Error("!date")
        const submission = submissions.get(date)
        if (submission) {
            console.log(`have submission for date ${date}`)
            const kmInput = await form.$("input[name=km_amount]")
            if (!kmInput) throw Error("!kmInput")
            await clearAndType(kmInput, submission.km.toFixed(1))
            await Promise.all([
                page.waitForResponse("https://www.kilometrikisa.fi/contest/log-save/"),
                page.keyboard.press("Enter")
            ])
        }
    }
}

async function enterDurations(page: Page, submissions: Map<string, Submission>): Promise<void> {
    for (const form of await page.$$("#minute-calendar form[class=minute-log-form]")) {
        const date = await form.$eval("input[name=date]", e => e.getAttribute("value"))
        if (!date) throw Error("!date")
        const submission = submissions.get(date)
        if (submission) {
            console.log(`have submission for date ${date}`)
            const hoursInput = await form.$("input[name=hours]")
            const minutesInput = await form.$("input[name=minutes]")
            if (!hoursInput ||!minutesInput) throw Error("!hoursInput ||!minutesInput")
            await clearAndType(hoursInput, Math.floor(submission.minutes / 60).toFixed(0))
            await clearAndType(minutesInput, (submission.minutes % 60).toFixed(0))
            await Promise.all([
                page.waitForResponse("https://www.kilometrikisa.fi/contest/minute-log-save/"),
                page.keyboard.press("Enter")
            ])
        }
    }
}

async function clearAndType(element: ElementHandle, text: string): Promise<void> {
    await element.click()
    await element.evaluate(e => e.value = "")
    await element.type(text)
}
