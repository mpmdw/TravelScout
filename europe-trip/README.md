# Barcelona to Rome: 21-day itinerary

A single self-contained page (`index.html`) for a five-city, 20-night trip:

| # | City | Nights | Getting there |
|---|------|--------|---------------|
| 1 | Barcelona | 4 | Fly in from home |
| 2 | Paris | 4 | Flight (or direct TGV, ~6h 30m) |
| 3 | Grindelwald | 3 | Train via Basel and Interlaken, ~6h |
| 4 | London | 4 | Train to Zurich Airport, then fly |
| 5 | Rome | 5 | Flight, then fly home |

Open it by double-clicking `index.html`. It needs no build step and no dependencies, and doesn't touch the Next.js app.

## What's on the page
- **Controls:** start date (default Fri 4 Jun 2027), number of travelers, and an optional home airport. Every booking button updates to match, and your choices are saved in the browser.
- **One full-screen panel per city** with a real photo (credited on the panel), the night count, a short "why it's special", and one-tap booking buttons:
  - Flights go to **Google Flights** with the route and date filled in.
  - Hotels go to **Booking.com** with the city, check-in/out dates, guests and rooms filled in.
  - The Paris → Grindelwald train opens the route in **Google Maps (transit)**, with links to SNCF Connect and SBB for booking.
- **Route map:** a hand-traced coastline with the arc from Barcelona to Rome. Dashed legs are flights and solid legs are trains.
- **Cost estimate** with Saver / Comfort / Splurge tiers. It scales with the number of travelers and leaves out flights to and from Europe.

## Photos and credits
All photos come from Unsplash and are used under the [Unsplash License](https://unsplash.com/license). Each photographer is credited on their panel and again in the footer.

| City | Photo | Photographer |
|------|-------|--------------|
| Barcelona | [Sagrada Família during golden hour](https://unsplash.com/photos/j4eJ3gXlVQ0) | Siyuan ([@jsycra](https://unsplash.com/@jsycra)) |
| Paris | [Eiffel Tower during daytime](https://unsplash.com/photos/Q0-fOL2nqZc) | Anthony Delanoix |
| Grindelwald | [Chalet below the mountains](https://unsplash.com/photos/sd7jrJZPidA) | Peter Steiner |
| London | [Big Ben and Westminster](https://unsplash.com/photos/-_dNQHgv0kI) | Michael D Beckwith ([@michael_david_beckwith](https://unsplash.com/@michael_david_beckwith)) |
| Rome | [Colosseum at blue hour](https://unsplash.com/photos/VFRTXGw1VjU) | David Köhler |

The images load straight from Unsplash at 2400px wide. To swap one, change `photo` on that city in the `CITIES` array: `id` is the ID at the end of the Unsplash photo URL, and `pos` sets the crop focus.

## Tweaking
Everything lives in the `<script>` block of `index.html`:
- `CITIES` holds the order, nights, blurbs, photos and travel notes.
- `DEFAULT_START` is the default start date.
- `HOTEL` and `PER_PERSON` hold the numbers behind the cost estimate.
