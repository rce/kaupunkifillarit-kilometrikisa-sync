import * as puppeteer from "puppeteer"
import {fetchRentals, Rental} from "./hsl"
import {submitKaupunkifillariStats, Submission} from "./kilometrikisa"
import {DateTime, Interval} from "luxon";

const HSL_USERNAME = requireEnv("HSL_USERNAME")
const HSL_PASSWORD = requireEnv("HSL_PASSWORD")
const KILOMETRIKISA_USERNAME = requireEnv("KILOMETRIKISA_USERNAME")
const KILOMETRIKISA_PASSWORD = requireEnv("KILOMETRIKISA_PASSWORD")

async function main() {
    const browser = await puppeteer.launch({
        defaultViewport: { width: 1024, height: 768 },
        headless: process.env.HEADLESS === "true",
        slowMo: 10,
    })

    try {
        const page = await browser.pages().then(([first, ...rest]) => first)
        const rentalsThisMonth = rentalsInThisMonth(await fetchRentals(page, HSL_USERNAME, HSL_PASSWORD))
        const submissions = groupRentalsIntoDailyKilometrikisaSubmissions(rentalsThisMonth)
        await submitKaupunkifillariStats(page, submissions, KILOMETRIKISA_USERNAME, KILOMETRIKISA_PASSWORD)
    } finally {
        await browser.close()
    }
}

function rentalsInThisMonth(rentals: ReadonlyArray<Rental>): Rental[] {
    const now = DateTime.now()
    const interval = Interval.fromDateTimes(now.startOf('month'), now.endOf('month'))
    return rentals.filter(r => interval.contains(r.date))
}

function rentalsBeforeToday(rentals: ReadonlyArray<Rental>): Rental[] {
    const today = DateTime.now().startOf("day")
    return rentals.filter(r => r.date < today)
}

function groupRentalsIntoDailyKilometrikisaSubmissions(rentals: ReadonlyArray<Rental>): Map<string, Submission> {
    const grouped = groupBy(rentals, r => r.date.toFormat("yyyy-MM-dd"))
    return mapValues(grouped, sumRentalsToSubmission)
}

function sumRentalsToSubmission(rentals: Rental[]) : Submission {
    return {
        date: rentals[0].date,
        km: sum(rentals.map(_ => _.distanceKilometers)),
        minutes: sum(rentals.map(_ => _.durationMinutes)),
    }
}

function mapValues<K, V, R>(map: Map<K, V>, predicate: (v: V) => R): Map<K, R> {
    const newMap = new Map<K, R>()
    for (const [key, value] of map) {
        newMap.set(key, predicate(value))
    }
    return newMap
}

function groupBy<K, V>(xs: ReadonlyArray<V>, predicate: (x: V) => K): Map<K, V[]> {
     return xs.reduce((acc, x) => {
        const k = predicate(x)
        const v = acc.get(k) ?? []
        acc.set(k, [...v, x])
        return acc
    }, new Map<K, V[]>())
}

function sum(xs: number[]): number {
    return xs.reduce((acc, x) => acc + x, 0)
}

function requireEnv(name: string): string {
    const value = process.env[name]
    if (value) {
        return value
    } else {
        throw new Error(`Environment varable ${name} is required`)
    }
}

main().catch(err => { console.error(err); process.exit(1) })