# Buddy Features

Buddy is local-first, lightweight, and built to add a little personality to focused work.

## New In 0.10.0

Personalized pixel level-up cards now appear inside the Buddy panel, with a thumbnail gallery and original-image access. A saved local seed makes the 100 level designs personal to your profile; each earned card preserves your Buddy, optional family, colors, and progress at that moment.

The panel menu also includes a gentle **Focus Timer** and **Arrange Decorations**. Focus sessions support presets or 1–180 custom minutes, persist their deadline across reloads, and restore the previous Focus Mode setting when finished or cancelled. A waking stretch and break invitation appear when Buddy leaves focus.

Earn a pixel plant (level 2), cushion (5), lamp (10), and yarn toy (15), plus a bonsai (3-day care streak) and star mobile (7-day streak). Place, move, or remove them using five responsive horizontal positions in the menu. Unlocks and placement stay saved locally, including across Reset All State.

Awake family neighbors greet, chase where space allows, and curl up nearby; family members on the floor can nudge the ball. Sleeping members retain independent schedules. Social play pauses during Focus Mode.

## New In 0.9.0

Grow a family, give Buddy a ball, and personalize the scene with eight pixel backgrounds and nine companion colors. Family members have their own activity and nap schedules. The compact panel keeps controls in its title bar and menus, opens automatically by default, and starts Buddy at the smaller size.

## Companion Behavior

Buddy starts at the small size. Toggle Size switches between small and large and preserves your choice across reloads. Reset All State restores the small size.

- Animated sidebar companion with idle, typing, searching, thinking, sleeping, happy, and jump states.
- First-open spawn animation with a Buddy greeting and heart reveal.
- Editor-aware reactions while you write, navigate, save, and run terminal commands.
- Cursor-aware look sprites when your pointer gets close to Buddy.
- Speech bubbles for break reminders, heart loss, attention prompts, food refusal, and treat eating.

## Health And Care

Buddy has a three-heart health meter. By default, one heart is lost every three active VS Code runtime hours, and Buddy shows a floating soul when all hearts are gone. Time while VS Code is closed or the computer is asleep does not stack up as missed heart loss.

Treats have distinct effects:

| Treat | Effect |
| --- | --- |
| Cookie | Restores one red heart. |
| Sandwich | Refills missing red hearts. |
| Cake | Grants up to two gold heart shields after the three red hearts. |
| Coffee | Activates a 2x XP boost for 30 minutes. |

Timed heart loss consumes gold hearts before red hearts. After four treats within 30 minutes, Buddy refuses extra food with a full-status bubble before another treat drops, but losing a heart resets that fullness.

Buddy can also drop care and celebration treats automatically. When Buddy is down to one red heart, every tenth productive action such as a save, commit, or push can drop a sandwich on a cooldown. Cake is rarer: it can drop for major level milestones, first push, care streaks, and occasional level-up, push, or first-commit celebrations when Buddy already has full red hearts and room for a gold heart. Automatic treat drops use the same overfeeding guard as manual treats.

## Movement And Interaction

- Command-click inside the Buddy panel to offer a cookie at that spot.
- Double-click the panel to make Buddy walk or dash to the selected spot.
- Buddy dashes when he goes after treats that are farther away.
- Panel title bar icons let you feed, revive, toggle the ball, and manage Buddy’s family. Kill and break-prompt commands remain in the Command Palette.

## XP And Levels

Buddy tracks XP across sessions:

| Activity | XP |
| --- | ---: |
| Supported local file save | 1 |
| Feeding Buddy | 5 |
| Git commit detected by VS Code | 20 |
| Successful integrated-terminal `git push` | 30 |

Coffee activates a 2x XP multiplier for 30 minutes. Every fifth detected Git commit drops coffee for Buddy, unless a higher-priority recovery or celebration treat has just dropped. Commits made from the Source Control panel count because Buddy listens to VS Code's built-in Git repository state.

Buddy has levels up to 100. Each level needs more XP than the previous level, with the level 100 cap tuned to about 85,000 total XP. If Buddy dies, he loses a configurable percentage of the XP requirement for his current level, which can drop him to a lower level when his current XP is low enough.

Level-up cards use 100 deterministic pixel designs personalized by a random seed saved for each local Buddy profile. Scenery, palettes, constellations, and ornaments vary with the seed and level. Each card snapshots the earned level, date, total XP, life day, care streak, today's completed quest count, Buddy's chosen color, and any partner or kids actually present. Solo users receive solo portraits. PNGs and snapshot metadata are saved locally and never regenerated from later state.

New cards appear in an in-panel overlay. Escape or X closes it; Gallery opens thumbnails, Prev/Next browses them, and Open Image opens the original PNG. `Buddy: Open Level-Up Gallery` is also in the panel's … menu. Existing PNG cards remain accessible. Cards earned with the panel closed survive reloads in a pending queue and render on its next opening. Multiple levels gained at once each receive a card. Reset All State keeps the collection and design seed. Previous levels are not backfilled; the level 1 design is available to the renderer, while earning starts at the next level-up.

## Daily Quests

Daily quests are repeatable local goals that reset each calendar day. Buddy shows today's collapsed quest summary in the sidebar, expands it on click, and awards 10 XP when each quest is completed.

Current daily quests:

- Save 10 files.
- Make 1 commit.
- Take a break by toggling Buddy's break prompt.
- Push today's work with a successful integrated-terminal `git push`.

Daily quests are separate from milestone reactions: quests are recurring daily progress, while milestones are one-time or first-of-day celebrations.

## Milestone Reactions

Milestone reactions add a configurable XP bonus, visual toast, and XP burst. Current milestones include:

- First save of the day.
- First feeding of the day.
- First attention action of the day.
- Daily care streak after feeding Buddy and giving attention on the same day. Buddy keeps a current and best care streak, forgives up to two missed local calendar days, and restores the grace allowance after the next completed care day.
- First coffee boost of the day.
- First commit of each day.
- First successful push.
- Long focused session.
- Levels 10, 25, 50, 75, and 100.

Milestone reactions are local and configurable through VS Code settings:

| Setting | Default | What it does |
| --- | --- | --- |
| `buddy.milestoneReactions.enabled` | `true` | Turns milestone visual and XP reactions on or off. |
| `buddy.milestoneReactions.focusedSessionMinutes` | `90` | Sets the continuous VS Code focus time needed for the long focused session milestone. |
| `buddy.milestoneReactions.xpBonus` | `15` | Sets the XP bonus awarded by each milestone reaction. |

## Care Difficulty

Care difficulty settings are local VS Code settings:

| Setting | Default | What it does |
| --- | --- | --- |
| `buddy.care.heartDrainIntervalMinutes` | `180` | Sets the minutes between automatic heart loss events. |
| `buddy.care.breakPromptIntervalMinutes` | `25` | Sets the minutes between automatic break prompts. |
| `buddy.care.xpMultiplier` | `1` | Multiplies future XP gains before temporary coffee boosts are applied. |
| `buddy.care.deathPenaltyPercent` | `25` | Sets the current-level XP requirement percentage lost when Buddy dies. |
| `buddy.care.canDie` | `true` | Controls whether Buddy can reach zero hearts and enter the death state. |

## Focus Mode

Run `Buddy: Toggle Focus Mode` during deep work to let Buddy nap quietly. Focus mode persists across VS Code reloads, shows Buddy's sleeping animation and a `FOCUS MODE ON` panel indicator, pauses automatic heart loss, hides panel care actions, and stops automatic or manual break prompts until it is turned off.

## Attention

Buddy's attention meter is a softer daily care goal, not a life-or-death need. It drops from full to empty across about 8 hours when Buddy has not received attention and refills when you feed Buddy, tap him for love, or double-click the panel to make him chase to a spot.

When attention gets low, Buddy may give a friendly reminder in a speech bubble.

## Life Counter

Buddy tracks the current life across sessions with a day counter in the panel. The counter scrambles into place, keeps going while Buddy is alive, and restarts from Day 1 after Buddy has died and been revived.

## Buddy Family

Use the Manage Family toolbar icon or the Command Palette to spawn one partner, then add up to four mini Buddys. The partner uses a different sprite tint, and the kids use smaller versions of Buddy’s existing animations. Each has an independent activity cycle: looking around, thinking, small movements, celebrations, and naps. Clicking a member wakes it for love. Focus Mode deliberately puts everyone to sleep and pauses their individual schedules. Animation footprints stay separated, using another row when the floor is crowded. They remain present when Buddy dies and have no separate care requirements. Family state persists locally across reloads; the Command Palette’s Buddy: Clear Family or Buddy: Reset All State removes it.

## Ball Play And Backgrounds

Toggle the ball with the panel’s ball icon, or use the Command Palette. It loses energy against the edges and floor until it rests. Buddy sometimes watches it settle, stalks and pounces from a distance, hops onto it nearby, nudges it, or briefly holds it in his mouth before spitting it upward or outward. These play bouts alternate with pauses, and mouthing the ball has no feeding or XP effect. The ball stays within resized scenes, suspends animation while the panel is hidden, and is a temporary toy rather than persisted care state. Feeding, manual movement, breaks, death, and Focus Mode end play; spawning a ball does not farm attention or XP.

Buddy: Choose Background in the panel’s … menu or Command Palette offers responsive pixel meadow, night, cherry blossom garden, Japanese temple, space station, neon city, underwater reef, and mushroom forest scenes, the default theme background, and custom PNG/JPEG/WebP/GIF images up to 10 MB. Built-in scenes redraw on a four-pixel grid as the panel changes shape. Custom images preserve proportions with Fill (cropped) or Fit (whole image), or repeat at 4× pixel scale with Tile. Background choices persist in extension storage; imported images are copied there, so moving the source file does not break them. Remote windows use the filesystem of the extension host. Reset All State restores the theme background.

## Startup And Panel Size

Buddy opens on startup and reload by default (`buddy.openOnStartup: true`). Turn this off to keep your chosen sidebar at startup. Buddy follows the available panel height and width without a minimum scene height, keeping Buddy anchored to the visible bottom as the panel shrinks. The panel contains only the scene; actions live in toolbar icons, the panel’s … menu, and the Command Palette. The outer sidebar divider remains controlled by VS Code.

## Companion Colors

Buddy: Change Colors is available from the Command Palette and the panel’s … menu. Choose Buddy, Partner, Kids, or Everyone, then a green, mint, sky blue, blue, purple, pink, red, orange, or gold sprite tint. Kids share one color, including kids spawned later. Choices persist locally; Restore default colors or Reset All State restores the original green Buddy/kids and blue partner. Colors tint the existing animated sprites without changing backgrounds or care items.
