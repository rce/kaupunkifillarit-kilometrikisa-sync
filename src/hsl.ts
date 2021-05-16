import {Page, ElementHandle, WaitForOptions} from "puppeteer"
import { DateTime } from "luxon"

export type Rental = {
    date: DateTime,
    durationMinutes: number
    distanceKilometers: number
}

export async function fetchRentals(page: Page, username: string, password: string): Promise<Rental[]> {
    await login(page, username, password)

    const rentalElements = await page.$$("[class^=Rental_rental_")
    console.log(rentalElements)
    return await Promise.all(rentalElements.map(async (e: ElementHandle<Element>): Promise<Rental> => {
        return {
            date: await parseDate(e),
            durationMinutes: await parseDurationMinutes(e),
            distanceKilometers: await parseDistanceKilometers(e),
        }
    }))
}

async function login(page: Page, username: string, password: string): Promise<void> {
    await page.goto("https://www.hsl.fi/omat-tiedot/kaupunkipyorat/matkahistoria")
    await whileWaitingForNavigation(page, () =>
        page.click("aria/Kirjaudu"))

    await page.type(".login-username-field", username)
    await page.type(".login-password-field", password)

    // Login does bunch of redirects so we wait for both load and networkidle0
    await whileWaitingForNavigation(page, () =>
            page.click("aria/Kirjaudu"),
        { waitUntil: ["load", "networkidle0"] })
}

async function parseDate(rentalElement: ElementHandle): Promise<DateTime> {
    const textContent = await rentalElement.$eval( "[class^=Rental_date__", e => e.textContent)
    const date = textContent?.match(/\d{1,2}.\d{1,2}\.\d{4}/)?.[0]
    assertDefined(date)
    return DateTime.fromFormat(date, "d.M.yyyy")
}

async function parseDurationMinutes(rentalElement: ElementHandle): Promise<number> {
    const textContent = await rentalElement.$eval( "[class^=Rental_duration__", e => e.textContent)
    const cleaned = textContent?.replace(" min", "")
    assertDefined(cleaned)
    return parseInt(cleaned, 10)
}

async function parseDistanceKilometers(rentalElement: ElementHandle): Promise<number> {
    const textContent = await rentalElement.$eval( "[class^=Rental_distance__", e => e.textContent)
    const cleaned = textContent?.replace(",", ".").replace(" km", "")
    assertDefined(cleaned)
    return parseFloat(cleaned)
}

async function whileWaitingForNavigation<T>(page: Page, action: () => Promise<T>, waitForOptions: WaitForOptions = {}): Promise<T> {
    const navigationPromise = page.waitForNavigation(waitForOptions)
    const result = await action()
    await navigationPromise
    return result
}

function assertDefined<T>(t: T | undefined): asserts t {
    if (!t) throw new Error(`expected ${t} to be defined`)
}
