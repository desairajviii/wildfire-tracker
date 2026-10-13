# Wildfire Tracker: Design Document

**Team:** Rajvi Desai, Jharshini Vejaya Kumar
**Class:** CS5610 Web Development, Northeastern University, Fall 2026

## Project description

Wildfire Tracker helps people follow US wildfires in relation to the places
and trips they care about. Existing tools like Watch Duty and InciWeb show
fires on a national map, which leaves people to work out for themselves
whether a fire is near their family or their trail. Wildfire Tracker answers
those questions directly: "Is there a fire near my parents' house?" and "Are
there active fires near my trail this weekend?"

Fire data comes from NIFC Open Data (National Interagency Fire Center). A seed
script loads about 200,000 US wildfires from the last five years into MongoDB,
and users can browse and filter them by state and active status.

The app has two main parts:

- **Monitoring (Rajvi):** save places to watch, like a family home, with a
  radius in miles, and see active fires within that distance. Read and post
  community reports about a specific fire, such as smoke, road closures, or
  evacuation notes.
- **Preparedness (Jharshini):** save hiking trips with a trail location,
  dates, and a buffer distance, and see active fires near the trail. Create
  household evacuation plans and share them with family through a read-only
  link.

There's no login. Each browser gets a random ID that keeps its data separate
from other people's.

## User personas

### Maya, a household planner

Maya lives in Boston, but her parents live in a fire-prone part of California.
During fire season she checks several websites to see whether any fires are
close to their home, and she has to work out the distances herself. She wants
one place to watch their area, see what people nearby are reporting, and keep
an evacuation plan ready that she can send to the family.

**Goals:** know quickly whether a fire is near her parents; get on-the-ground
information beyond official updates; have a plan the whole family can see.
**Frustrations:** national maps make her search for the right area every time;
official updates can lag behind what people nearby are seeing.

### Jake, a hiker

Jake plans weekend hikes on trails in the West. He has had trips ruined by
smoke and trail closures he didn't know about until he arrived. He wants to
check for active fires near a trail before he drives out.

**Goals:** check his planned trails for nearby fires in one step; keep his
upcoming trips in one place.
**Frustrations:** fire maps aren't organized around trails or trip dates.

## User stories

### Rajvi: Monitoring

1. **Browse fires.** As Maya, I want to browse and filter US wildfires by state
   and active status, so that I can see what's burning in the area I care
   about.
2. **Watchlists.** As Maya, I want to save places to watch with a radius in
   miles, so that I can see active fires near my parents' home.
3. **Reports.** As Maya, I want to post and read reports about a fire (smoke,
   road closures, evacuations), so that I can share and learn what's happening
   on the ground. Only the author can edit or delete their report, and reports
   are labeled unverified.

### Jharshini: Preparedness

4. **Trip plans.** As Jake, I want to save trip plans with a trail location,
