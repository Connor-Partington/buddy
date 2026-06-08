# Buddy Features

Buddy is local-first, lightweight, and built to add a little personality to focused work.

## Companion Behavior

- Animated sidebar companion with idle, typing, searching, thinking, sleeping, happy, and jump states.
- First-open spawn animation with a Buddy greeting and heart reveal.
- Editor-aware reactions while you write, navigate, save, and run terminal commands.
- Cursor-aware look sprites when your pointer gets close to Buddy.
- Speech bubbles for break reminders, heart loss, attention prompts, food refusal, and treat eating.

## Health And Care

Buddy has a three-heart health meter. One heart is lost every three local wall-clock hours, and Buddy shows a floating soul when all hearts are gone.

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
- Panel title bar actions let you feed, revive, kill, and toggle break prompts.

## XP And Levels

Buddy tracks XP across sessions:

| Activity | XP |
| --- | ---: |
| Supported local file save | 1 |
| Feeding Buddy | 5 |
| Git commit detected by VS Code | 20 |
| Successful integrated-terminal `git push` | 30 |

Coffee activates a 2x XP multiplier for 30 minutes. Every fifth detected Git commit drops coffee for Buddy, unless a higher-priority recovery or celebration treat has just dropped. Commits made from the Source Control panel count because Buddy listens to VS Code's built-in Git repository state.

Buddy has levels up to 100. Each level needs more XP than the previous level, with the level 100 cap tuned to about 85,000 total XP. If Buddy dies, he loses 25% of the XP requirement for his current level, which can drop him to a lower level when his current XP is low enough.

When Buddy levels up while the panel is open, Buddy saves a local PNG level-up card and offers to open it. `Buddy: Open Level-Up Gallery` lets you browse and reopen saved cards later.

## Milestone Reactions

Milestone reactions add a configurable XP bonus, visual toast, and XP burst. Current milestones include:

- First save of the day.
- First feeding of the day.
- First attention action of the day.
- Daily care streak after feeding Buddy and giving attention on the same day.
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

## Attention

Buddy's attention meter is a softer daily care goal, not a life-or-death need. It drops from full to empty across about 8 hours when Buddy has not received attention and refills when you feed Buddy, tap him for love, or double-click the panel to make him chase to a spot.

When attention gets low, Buddy may give a friendly reminder in a speech bubble.

## Life Counter

Buddy tracks the current life across sessions with a day counter in the panel. The counter scrambles into place, keeps going while Buddy is alive, and restarts from Day 1 after Buddy has died and been revived.
