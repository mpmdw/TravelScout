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
- **One full-screen panel per city** with an illustrated travel-poster scene, the night count, a short "why it's special", and one-tap booking buttons:
  - Flights go to **Google Flights** with the route and date filled in.
  - Hotels go to **Booking.com** with the city, check-in/out dates, guests and rooms filled in.
  - The Paris → Grindelwald train opens the route in **Google Maps (transit)**, with links to SNCF Connect and SBB for booking.
- **Route map:** a hand-traced coastline with the arc from Barcelona to Rome. Dashed legs are flights and solid legs are trains.
- **Cost estimate** with Saver / Comfort / Splurge tiers. It scales with the number of travelers and leaves out flights to and from Europe.

## Using real photos
The city scenes are drawn in code on `<canvas>`, so the page works offline and never shows a broken image. To use photos instead, set `photo` on any entry in the `CITIES` array (a URL or a relative path such as `img/rome.jpg`). If a photo fails to load, the illustration stays.

## Tweaking
Everything lives in the `<script>` block of `index.html`:
- `CITIES` holds the order, nights, blurbs and travel notes.
- `DEFAULT_START` is the default start date.
- `HOTEL` and `PER_PERSON` hold the numbers behind the cost estimate.
