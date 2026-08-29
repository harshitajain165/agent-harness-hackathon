# Nolan, explained in plain English

This is the same plan as [`PROJECT_PLAN.md`](../PROJECT_PLAN.md), with the jargon taken out.
Read this first. Go to the other one when you need the exact commands and config.

---

## What are we building?

**A robot marketing intern called Nolan.**

You tell it, in one sentence, what your team just shipped:

> *"We just shipped dark mode in our dashboard. Make a launch video and a post for LinkedIn and X."*

And then it goes and does the whole job:

1. **It opens your product** in a browser window and clicks through the new feature, while recording
   the screen — like a person doing a screen recording, except it decided what to click on its own.
2. **It writes and records a voiceover** explaining what the feature does.
3. **It glues the video and the voiceover together** into a finished demo video.
4. **It writes the launch posts** — one for LinkedIn, one for X.
5. **It stops and asks you.** Nothing gets published until you've watched the video, read the posts,
   and clicked approve.

Then, after you've posted, you can ask it a second question — *"how did that do?"* — and it goes
and finds out:

6. **It looks up how your post performed**, and goes and reads what your competitors posted about
   similar launches, and how *those* did.
7. **It tells you what actually works** in your industry — how long the good videos are, how they
   open, what tone they use.
8. **It rewrites your original prompt** so next time you ask for something better.

We called it Nolan because it's directing the whole shoot: shot list, camera, sound, edit, and
then the notes for the next take.

---

## Why is this interesting, and not just a chatbot?

Because it *does things*. It opens a browser. It moves a mouse. It records audio. It writes video
files to your hard drive. It goes out and reads web pages.

A chatbot tells you how to make a launch video. Nolan makes the launch video.

That distinction is the entire point of the hackathon, so it's the thing we protect when we're
short on time.

---

## What is "the harness" and why are we using it?

Think of an AI agent as having two halves.

The **brain** is the AI model. It's good at deciding what to do next, but on its own it can't
actually do anything — it just produces text.

The **harness** is everything else: the part that takes the brain's decision, actually runs it,
shows you what happened, remembers the conversation, stops and asks permission before anything
risky, and keeps track of it all. It's the difference between an engine and a car.

**TrueForge is the harness.** It's an open-source project we're building on top of. It gives us,
for free, a pile of things that would otherwise eat our entire day:

- The loop that lets the agent keep working step after step.
- The ability to hand it tools and have it decide which to use.
- **The "stop and ask permission" mechanism** — the thing that pauses before publishing.
- The ability for the agent to **clone itself** to do several things at once.
- Memory of the conversation, so our follow-up question works.

We're being judged partly on how well we use it, so we use its real features rather than
bolting our own versions on the side.

---

## How does it actually work? (the shape of it)

Four programs running on one laptop:

| Program | What it is | Plain version |
|---|---|---|
| **TrueForge** | The harness | The brain's body. Runs the agent, handles permission prompts, remembers things |
| **Our tool server** | Our code | The toolbox. Holds the "record the screen", "make a voiceover", "glue the video together" tools |
| **Nolan Studio** | Our code | The screen you look at. Shows what the agent is doing right now |
| **Demo app** | Our code | A small fake product with a dark-mode feature, for Nolan to record |

The flow, in words:

> You type a sentence into **Nolan Studio**. It goes to **TrueForge**, which asks the AI model what
> to do. The model says "record the demo" — so TrueForge reaches into **our toolbox** and runs the
> recording tool. That tool opens a browser, records the screen, and saves a video file. All the
> while, our Studio screen is showing you each step as it happens. When the model gets to
> "publish this", TrueForge stops everything and waits for you to click approve.

That's it. There's no magic layer.

---

## Three things we found out that changed the plan

Before writing any of this, we read TrueForge's actual source code. Three of our original
assumptions turned out to be wrong. Better to find that out now than at 3pm.

### 1. We can't use TrueForge's built-in "safe room" for the recording

TrueForge can give an agent a **sandbox** — a locked-down computer where it can run code without
being able to break anything. Sounds perfect for us.

Except that sandbox lives on a *different computer, in the cloud*. It can't see your laptop's
screen, and it can't reach the demo app running on your laptop. So it's useless for screen
recording.

**What we're doing instead:** our recording tools run directly on our own laptop, in our own
program, and we plug that program into TrueForge as a tool provider. This is actually the way
TrueForge is designed to be used, so we're not fighting it — we're just not using the sandbox.

*Side effect:* TrueForge has a feature called "Skills" — reusable instruction manuals for the
agent — but they only work inside that cloud sandbox. So we build our own version: instruction
files in our repo that the agent can ask for when it needs them.

### 2. We can't name the agent's helpers in advance

We'd imagined declaring a "recorder agent", a "writer agent", an "analyst agent" — a little org chart.

TrueForge doesn't work that way. The agent decides *in the moment* to clone itself and writes the
instructions for each clone on the spot.

**What we're doing instead:** we use the cloning where it genuinely helps — when it's reading five
competitor posts at once, it spins up one clone per post and they all work in parallel. That looks
great on screen (five lanes filling up at the same time) and it's a real benefit, not decoration.

### 3. Bright Data is already a one-click button in TrueForge

Bright Data is the service that lets us read web pages that normally block robots — LinkedIn, X,
and so on. We assumed wiring it up would be the impressive part.

It isn't. It's already in TrueForge's built-in list of connectors. Anyone at this hackathon can
click it once and have it working.

**So merely using Bright Data wins us nothing.** What we do on top of it is the thing. See below.

---

## Our bet on the Bright Data prize

Here's the problem with scraping websites: **websites change, and your scraper silently breaks.**
Someone redesigns a page, the little tag your code was looking for is gone, and from then on your
scraper quietly returns nothing. Usually nobody notices for weeks.

So we're building something that fixes itself:

1. Every website we scrape has a **recipe** — a small config file, saved in our repo, that says
   "the number of likes is *here*, the post text is *here*".
2. Each recipe also lists **what a correct result looks like** — "there must be a title", "the like
   count has to be an actual number", "the body has to be longer than 200 characters".
3. When Nolan scrapes a page, it checks the result against those rules. If something's missing,
   it doesn't shrug and carry on — **it says exactly what broke**: which field, and what the page
   looks like now around where that field used to be.
4. Nolan then **works out the new location itself**, and proposes a fix to the recipe.
5. **It asks you to approve the fix** — because it's editing a file in our repo.
6. Once approved, it tests the fix against a saved copy of the old page (to make sure it didn't
   break anything else), saves it as a new version, and re-runs. Green.

So it's a scraper that notices it's broken, diagnoses itself, proposes a repair, gets a human to
sign off, and commits the fix.

**We're going to break one on purpose during the demo** — and say out loud that we're doing it —
so everyone can watch the repair happen live. Then we show the fix sitting in our repo's history.

---

## What we're deliberately NOT building

One day is not much. The plan is a narrow thing done properly, not a wide thing done badly.

**Not building:** logins, user accounts, cloud hosting, a video-editing screen, multiple languages,
support for anyone else's product.

**Faking, and saying so out loud:**

- **Publishing.** Clicking "approve" doesn't really post to LinkedIn. It saves the post locally and
  shows you a realistic-looking preview. Real posting is an API-key-and-OAuth nightmare that would
  eat half our day and impress nobody.
- **The competitor list.** Three real posts we picked in advance, not open-ended searching.
- **The broken scraper.** Deliberately pointed at an old version, not genuinely broken.

We say all of this during the demo. Judges are fine with a disclosed shortcut. They are not fine
with discovering a hidden one.

---

## Who does what

Three people, roughly ten hours.

| | Owns |
|---|---|
| **Designer** | How everything looks — the Studio screen, and the fake product Nolan records (it's on camera, so it has to look real). Plus demo assets and the write-up visuals |
| **Dev 1** | The agent itself and the video pipeline — screen recording, voiceover, stitching |
| **Dev 2** | The screen you watch, and everything Bright Data — the scraping, the recipes, the self-repair |

### The three moments that matter

**Hour 3 — "everything connected, nothing real."**
The whole thing works end to end, but every piece is fake. You type a prompt, fake steps appear,
a fake permission box pops up, a fake video plays. Sounds pointless. It isn't — it means every
join between our three people's work is already proven, and the rest of the day is just swapping
fake parts for real ones. Teams that skip this find out at 8pm that their pieces don't fit.

**Hour 6 — "a real video with real narration plays on our screen."**
If we've got this, we carry on to the analysis half. If we haven't, we drop the analysis half
entirely and make the first half perfect. **A great half beats a broken whole**, every time.

**Hour 8 — everything stops.**
No new features after this point, no matter how tempting. The last two hours are for practising
the demo — running it start to finish, three times. This rule only works if we all agree to it
now, while we're calm and it costs nothing.

---

## The demo (3½ minutes)

1. **"Every time we ship something, someone loses a day making the video and writing the posts."**
2. Type one sentence. Steps start appearing on screen.
3. **The moment that wins it:** a browser opens by itself and clicks through the product while our
   screen narrates what it's doing, live.
4. The finished video plays. Both posts appear next to it.
5. **It stops and asks permission.** We edit a line, approve. Post appears.
6. Second question: *"how did it do?"* Five lanes fan out across competitor posts at once.
7. **The scraper breaks.** Nolan spots it, diagnoses it, proposes a fix, asks permission, fixes it.
   We show the fix in the repo.
8. The insights, and a better prompt for next time. Finish on: **this whole thing cost 40 cents.**

---

## What will go wrong, and what we do about it

Every one of these has a backup that is **built and tested by hour 8**. A backup nobody has actually
pressed is not a backup.

| What breaks | How likely | What we do |
|---|---|---|
| **Screen recording fails** — permission prompt, a notification pops up mid-recording, wrong screen size | Very likely | Grant the permission *the night before*. Notifications off. A second, simpler recording method ready to switch to. A pre-made video as the final backstop |
| **The scraping gets blocked** or is slow | Likely | We save a copy of every page we scrape during the day. One setting switches the whole thing to replay from those copies. The demo can run with no internet |
| **TrueForge itself misbehaves** — it's brand new software, published days ago | Likely | We spend the first hour doing nothing but proving it works. We lock the version so it can't change under us |
| **Voiceover or video-glueing fails** | Possible | Voiceover for the demo script is pre-recorded and cached. The video settings are locked down and tested by hour 6 |
| **The venue wi-fi** | Possible | Phone hotspot, already connected and tested. With the cached scrapes and pre-made voiceover, the only thing that needs internet is the AI model itself. And a screen recording of the entire demo as the true last resort |

There's a sixth risk nobody writes down: **us, adding features at hour 9.** That's what the hour-8
freeze is for.

---

## If we're somehow ahead of schedule

In order of what's worth doing:

1. Turn on TrueForge's cloud sandbox so the final report is generated as a proper document — it's
   the one harness feature we're currently not using.
2. Make the scraper break genuinely live instead of staged.
3. Zoom and pan effects on the video, so it looks professionally edited.
4. A second demo product, to prove Nolan isn't hard-wired to just the one.
