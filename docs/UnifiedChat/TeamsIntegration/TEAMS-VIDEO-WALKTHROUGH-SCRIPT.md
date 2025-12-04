# COBRA Teams Integration - Video Walkthrough Script

## Video Overview

**Title:** COBRA Teams Integration - Complete Walkthrough  
**Duration:** ~12-15 minutes  
**Audience:** COBRA customers, IT administrators, end users  
**Format:** Screen recording with voiceover

---

## Video Sections

### Section 1: Introduction (1 minute)

**[SCREEN: COBRA logo, title slide]**

**NARRATOR:**

> "Welcome to the COBRA Teams Integration walkthrough. In this video, we'll show you how to connect Microsoft Teams with COBRA, enabling seamless communication between your Teams channels and COBRA emergency events.
>
> By the end of this video, you'll understand:
>
> - How to install the COBRA Communications bot
> - How to link Teams channels to COBRA events
> - How messages flow between both platforms
> - Tips for getting the most out of the integration"

**[SCREEN: Animated diagram showing Teams ↔ COBRA message flow]**

---

### Section 2: Prerequisites (1 minute)

**[SCREEN: Checklist on screen]**

**NARRATOR:**

> "Before we begin, let's make sure you have everything you need:
>
> First, you'll need a Microsoft 365 account with Teams access.
>
> Second, you or your IT administrator will need permission to install custom apps in Teams. This is usually enabled by default, but some organizations restrict it.
>
> Third, you'll need an active COBRA account with at least one event created.
>
> If you're unsure about any of these, check with your IT administrator or COBRA account manager."

**[SCREEN: Brief shot of Teams Admin Center showing app permissions]**

---

### Section 3: Installing the Bot (3 minutes)

**[SCREEN: Microsoft Teams interface]**

**NARRATOR:**

> "Let's start by installing the COBRA Communications bot. I'll show you the most common method - adding it directly to a team."

**[ACTION: Navigate to Apps in Teams]**

**NARRATOR:**

> "Click on 'Apps' in the left sidebar. Then search for 'COBRA Communications'."

**[ACTION: Search and find COBRA app]**

**NARRATOR:**

> "Here's our app. Click on it to see the details. You can see it's verified by COBRA and shows the permissions it requires."

**[ACTION: Click "Add to a team"]**

**NARRATOR:**

> "Click 'Add to a team'. Select the team and channel where you want the bot. For this demo, I'll add it to our 'Emergency Response' team in the 'General' channel."

**[ACTION: Select team and channel, click Set up]**

**NARRATOR:**

> "Now you'll see a permissions dialog. This is the Resource-Specific Consent - or RSC - that allows the bot to receive all channel messages, not just messages where someone @mentions the bot. This is essential for the integration to work. Click 'Accept'."

**[ACTION: Accept permissions]**

**NARRATOR:**

> "And that's it! The bot is now installed. You should see a welcome message from the bot confirming it's connected."

**[SCREEN: Show welcome message in channel]**

---

### Section 4: Linking to a COBRA Event (2 minutes)

**[SCREEN: Teams channel with bot installed]**

**NARRATOR:**

> "Now let's link this Teams channel to a COBRA event. Type '@COBRA Communications link' and press Enter."

**[ACTION: Type and send command]**

**NARRATOR:**

> "The bot responds with a card showing your available COBRA events. Select the event you want to link to this channel."

**[ACTION: Select event from dropdown]**

**NARRATOR:**

> "Click 'Link Event' to confirm. The bot will confirm the connection."

**[SCREEN: Show confirmation message]**

**NARRATOR:**

> "Excellent! This Teams channel is now linked to our 'Hurricane Response 2024' event in COBRA. Any messages sent here will appear in COBRA, and messages from COBRA will appear here."

---

### Section 5: Sending Messages (2 minutes)

**[SCREEN: Split view - Teams on left, COBRA on right]**

**NARRATOR:**

> "Let's see the integration in action. I'll send a message in Teams."

**[ACTION: Type message in Teams: "All evacuation routes are clear. Proceeding with Phase 2."]**

**NARRATOR:**

> "Watch the COBRA side..."

**[SCREEN: Message appears in COBRA with Teams indicator]**

**NARRATOR:**

> "There it is! The message appears in COBRA almost instantly. Notice the Teams icon showing where the message came from, and the sender's name."

**NARRATOR:**

> "Now let's go the other direction. I'll send a message from COBRA."

**[ACTION: Switch to COBRA, type message: "Confirmed. Medical team is standing by at Rally Point A."]**

**NARRATOR:**

> "And in Teams..."

**[SCREEN: Message appears in Teams as "[Sender via COBRA]"]**

**NARRATOR:**

> "The message appears with the sender's name and 'via COBRA' to show where it came from. This attribution is important so everyone knows the source of each message."

---

### Section 6: Checking Status (1 minute)

**[SCREEN: Teams channel]**

**NARRATOR:**

> "You can check the connection status anytime. Just type '@COBRA Communications status'."

**[ACTION: Send status command]**

**NARRATOR:**

> "The bot responds with a status card showing:
>
> - Connection status - green check means connected
> - Which COBRA event you're linked to
> - Recent activity statistics
>
> This is helpful for troubleshooting or just confirming everything is working."

---

### Section 7: COBRA UI Features (2 minutes)

**[SCREEN: COBRA event channel view]**

**NARRATOR:**

> "Let's look at how Teams messages appear in COBRA's interface."

**[ACTION: Navigate to event channel in COBRA]**

**NARRATOR:**

> "In the channel view, you can see messages from all sources in one unified timeline. Teams messages are marked with the Teams icon. You can filter by source if you need to see only Teams messages."

**[ACTION: Show filtering options]**

**NARRATOR:**

> "In the sidebar, you'll see the Teams channel listed under 'External Channels'. The green indicator shows it's connected."

**[ACTION: Point to sidebar]**

**NARRATOR:**

> "You can click on the Teams channel to see its specific configuration, or click 'Open in Teams' to jump directly to the Teams channel."

---

### Section 8: Best Practices (1.5 minutes)

**[SCREEN: Tips slide with icons]**

**NARRATOR:**

> "Here are some best practices for using the Teams integration effectively:
>
> **First, keep messages concise.** Both platforms display messages differently, so clear, brief messages work best.
>
> **Second, don't rely on rich formatting.** Bold text, bullets, and other formatting in Teams may appear as plain text in COBRA.
>
> **Third, verify critical messages.** For important communications, confirm receipt in the other platform.
>
> **Fourth, test before an emergency.** Make sure the integration is working during normal operations, not when you're in the middle of a crisis.
>
> **And finally, train your team.** Make sure everyone knows that messages are being shared between platforms."

---

### Section 9: Troubleshooting (1.5 minutes)

**[SCREEN: Troubleshooting checklist]**

**NARRATOR:**

> "If something isn't working, here are the most common issues and solutions:
>
> **Messages not appearing?** First, check the status with '@COBRA Communications status'. If it shows disconnected, try unlinking and re-linking the channel.
>
> **Bot not responding?** Make sure you're using the @mention - type '@COBRA Communications' before your command.
>
> **Can't install the bot?** Your Teams administrator may need to allow custom apps. Contact your IT team.
>
> **For persistent issues,** contact COBRA support at support@cobrasoftware.com with your organization name and the Teams channel you're trying to connect."

---

### Section 10: Unlinking and Cleanup (1 minute)

**[SCREEN: Teams channel]**

**NARRATOR:**

> "If you need to disconnect a channel, type '@COBRA Communications unlink'."

**[ACTION: Send unlink command]**

**NARRATOR:**

> "Confirm by clicking 'Yes, Unlink'. Messages will stop flowing between the platforms, but all historical messages are preserved in both systems.
>
> To remove the bot entirely, go to Manage Team, then Apps, find COBRA Communications, and click Remove."

---

### Section 11: Conclusion (30 seconds)

**[SCREEN: Summary slide with key points]**

**NARRATOR:**

> "That's the COBRA Teams Integration! To recap:
>
> - Install the bot from Teams Apps
> - Link channels to COBRA events using '@COBRA Communications link'
> - Messages flow automatically both directions
> - Check status anytime with '@COBRA Communications status'
>
> For more detailed documentation, visit our support portal or check the guides provided by your COBRA administrator.
>
> Thank you for watching!"

**[SCREEN: COBRA logo, contact information]**

---

## Production Notes

### Screen Recording Requirements

- Resolution: 1920x1080 minimum
- Frame rate: 30 fps
- Audio: Clear voiceover, no background music during demos
- Captions: Include closed captions

### Demo Environment Setup

- Clean Teams environment with test team
- COBRA demo environment with sample event
- Pre-create some messages for the "message flow" section
- Have status showing realistic numbers

### B-Roll Suggestions

- Animated message flow diagram
- COBRA logo animations
- Transition slides between sections

### Accessibility

- All text readable at standard resolution
- Color contrast meets WCAG guidelines
- Closed captions synchronized
- Audio descriptions available

---

## Timestamps for Chapters

| Timestamp | Chapter                |
| --------- | ---------------------- |
| 0:00      | Introduction           |
| 1:00      | Prerequisites          |
| 2:00      | Installing the Bot     |
| 5:00      | Linking to COBRA Event |
| 7:00      | Sending Messages       |
| 9:00      | Checking Status        |
| 10:00     | COBRA UI Features      |
| 12:00     | Best Practices         |
| 13:30     | Troubleshooting        |
| 15:00     | Unlinking and Cleanup  |
| 16:00     | Conclusion             |

---

_Script Version: 1.0_  
_Last Updated: December 2025_
