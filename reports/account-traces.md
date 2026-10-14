# Five account traces

Tool-assisted source inspection, not a claim of independent human annotation. The recent-event IDs below were read from cleaned source rows and reconciled with SQL. All timestamps are UTC. Re-run these yourself before claiming personal ownership.

| Account | Cutoff | Recent source / SQL | Previous | Active / eligible | Open severe | Requests |
|---|---|---|---|---|---|---|
| A00000 | 2023-11-02 00:00:00 | 9 / 9 | 6 | 1 / 8 | 0 | 0 |
| A00001 | 2023-12-03 00:00:00 | 14 / 14 | 14 | 13 / 120 | 0 | 1 |
| A00002 | 2024-01-01 00:00:00 | 5 / 5 | 3 | 4 / 60 | 0 | 1 |
| A00003 | 2024-02-01 00:00:00 | 7 / 7 | 16 | 3 / 15 | 0 | 0 |
| A00004 | 2024-03-02 00:00:00 | 11 / 11 | 18 | 2 / 8 | 0 | 0 |

## A00000

Recent source IDs: E0004621, E0006524, E0013689, E0056077, E0064992, E0073001, E0073874, E0085303, E0098111. Each occurred in [T−30,T), was available at or before T and had valid licence membership.

## A00001

Recent source IDs: E0003577, E0018378, E0019935, E0036530, E0038637, E0059555, E0063100, E0064070, E0073314, E0077189, E0081432, E0082001, E0091188, E0095389. Each occurred in [T−30,T), was available at or before T and had valid licence membership.

## A00002

Recent source IDs: E0002985, E0004217, E0007707, E0063837, E0084520. Each occurred in [T−30,T), was available at or before T and had valid licence membership.

## A00003

Recent source IDs: E0024323, E0031117, E0041545, E0087705, E0090628, E0094865, E0095953. Each occurred in [T−30,T), was available at or before T and had valid licence membership.

## A00004

Recent source IDs: E0001884, E0007440, E0014102, E0021157, E0027395, E0040532, E0054308, E0057466, E0061634, E0065730, E0071970. Each occurred in [T−30,T), was available at or before T and had valid licence membership.

SQL uses LEFT JOIN aggregates so accounts with no requests or severe tickets remain present. This trace checks the source-event count independently; automated boundary fixtures separately exercise exact T, T−30, T−60 and T−90 edges. Personal review date/sign-off: pending.

## Arithmetic review of the five examples

- A00000: 1/8 active seats = 12.5%, so the low-seat flag applies. (9−6)/6 = +50%, so no decline flag. No severe support flag.
- A00001: 13/120 = 10.83%, so low-seat use applies. Recent and previous are both 14, so change is 0%. One observed request does not multiply those events.
- A00002: 4/60 = 6.67%, so low-seat use applies. (5−3)/3 = +66.67%, not decline. One request remains separate from event aggregation.
- A00003: 3/15 = exactly 20%, which does not satisfy the strict <20% condition. (7−16)/16 = −56.25%, so only decline applies.
- A00004: 2/8 = 25%, above the low-seat threshold. (11−18)/18 = −38.89%, which does not satisfy <−40%. No severe ticket means no configured flags.

These are tool-assisted arithmetic checks of observed sources, not completed personal or peer sign-offs.
