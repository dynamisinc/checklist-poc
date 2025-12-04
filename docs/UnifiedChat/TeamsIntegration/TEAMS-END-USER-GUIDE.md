# COBRA Teams Integration - End User Guide

## Overview

The COBRA Communications bot connects your Microsoft Teams channels with COBRA events, allowing you to communicate seamlessly across both platforms during emergencies and operations.

**What this means for you:**

- Messages sent in Teams automatically appear in COBRA
- Messages sent in COBRA automatically appear in Teams
- Stay informed using your preferred platform
- No need to switch between apps during critical situations

---

## Getting Started

### Finding the COBRA Bot

If your administrator has installed the COBRA Communications bot, you can find it in your Teams:

1. Click **Apps** in the left sidebar
2. Search for "COBRA Communications"
3. The app should appear in your organization's apps

![Find COBRA App](images/user-find-app.png)

### Checking If Your Channel Is Connected

Look for these indicators that a Teams channel is linked to COBRA:

1. **Welcome message:** When the bot is added, it posts a welcome message
2. **COBRA messages:** You'll see messages from COBRA users with `[Name via COBRA]` prefix
3. **Bot in members:** The "COBRA Communications" bot appears in the channel member list

---

## Sending Messages

### From Teams to COBRA

Simply send a regular message in your Teams channel. **That's it!**

Your message will automatically:

- Appear in the linked COBRA event channel
- Show your name as the sender
- Include the timestamp
- Be visible to all COBRA users monitoring that event

**No special formatting required.** Just type and send like you normally would.

![Send from Teams](images/user-send-teams.png)

### From COBRA to Teams

When you send a message in a COBRA channel that's linked to Teams:

1. Your message is sent to COBRA (as normal)
2. The bot automatically posts it to the linked Teams channel
3. Teams users see: **[Your Name via COBRA]** followed by your message

---

## Understanding Message Attribution

### Messages from Teams Users

In COBRA, messages from Teams appear with:

- 📱 Teams icon indicator
- Sender's Teams display name
- "via Teams" label
- Original timestamp

### Messages from COBRA Users

In Teams, messages from COBRA appear as:

```
[John Smith via COBRA]
The evacuation is complete. All personnel accounted for.
```

This format makes it clear:

- Who sent the message (John Smith)
- Where it came from (COBRA)
- The actual message content

---

## Bot Commands

You can interact with the COBRA bot using these commands. Type them in any channel where the bot is installed:

### @COBRA Communications help

Shows available commands and quick tips.

**Example:**

```
@COBRA Communications help
```

### @COBRA Communications status

Shows the current connection status, including:

- Whether the channel is linked to a COBRA event
- Which event it's linked to
- Last message timestamp
- Any connection issues

**Example:**

```
@COBRA Communications status
```

**Sample Response:**

```
📊 Connection Status

✅ Connected
Event: Hurricane Response 2024
Last Activity: 2 minutes ago
Messages Today: 47
```

### @COBRA Communications link

Starts the process to link this Teams channel to a COBRA event.

> **Note:** You may need appropriate COBRA permissions to link channels.

**Example:**

```
@COBRA Communications link
```

The bot will display a card where you can select which COBRA event to connect.

### @COBRA Communications unlink

Disconnects this Teams channel from the COBRA event.

- Messages stop flowing between platforms
- Historical messages are preserved in both systems
- You can re-link later if needed

---

## Frequently Asked Questions

### Can I see messages from before I joined?

Messages in Teams stay in Teams. Messages in COBRA stay in COBRA. The bot only bridges **new** messages sent after the connection is established.

To see historical messages:

- **Teams history:** Scroll up in the Teams channel
- **COBRA history:** Check the event's channel in COBRA

### What happens if I edit a message in Teams?

Currently, edits made in Teams after sending are **not** automatically updated in COBRA. The original message remains.

**Tip:** If you need to correct something important, send a follow-up message with the correction.

### What happens if I delete a message in Teams?

Deleted messages in Teams are **not** automatically deleted from COBRA. The message remains in COBRA's record.

This is intentional for audit and compliance purposes in emergency management.

### Can I send images or files?

**Images:** Yes, images sent in Teams will have their URLs shared in COBRA.

**Files:** File attachments are noted in COBRA with a link, but files are not automatically downloaded or transferred.

### Why do some messages show differently?

Messages may display differently based on:

- **Formatting:** Rich formatting in Teams (bold, bullets, etc.) may appear as plain text in COBRA
- **Mentions:** @mentions in Teams show as text in COBRA
- **Emojis:** Most emojis transfer correctly, but some may vary

### Can I use the bot in private chats?

The current integration is designed for **team channels only**, not private 1:1 chats or private group chats.

### What if the bot stops working?

If messages aren't flowing:

1. Check the bot status: `@COBRA Communications status`
2. Verify the channel is still linked
3. Contact your COBRA administrator
4. Check if the bot is still in the channel member list

---

## Best Practices

### During Emergencies

1. **Keep messages concise:** Clear, brief messages work best across platforms
2. **Use clear language:** Avoid platform-specific jargon
3. **Confirm receipt:** For critical messages, ask for acknowledgment
4. **Don't rely solely on one platform:** Verify important information reached all parties

### For Daily Operations

1. **Test the connection:** Periodically send test messages to verify flow
2. **Know both platforms:** Familiarize yourself with both Teams and COBRA
3. **Report issues early:** If something seems wrong, notify your administrator

### Message Formatting Tips

| Do                                  | Don't                                          |
| ----------------------------------- | ---------------------------------------------- |
| Keep messages under 2000 characters | Send extremely long messages                   |
| Use plain text for important info   | Rely heavily on rich formatting                |
| Include context in each message     | Assume recipients saw previous messages        |
| Use clear, professional language    | Use slang or abbreviations others may not know |

---

## Troubleshooting

### "I sent a message but it didn't appear in COBRA"

1. **Wait a moment:** There can be a brief delay (usually under 5 seconds)
2. **Check connection:** Use `@COBRA Communications status`
3. **Verify linking:** Ensure the channel is linked to an event
4. **Contact admin:** If the issue persists, contact your COBRA administrator

### "I don't see messages from COBRA in Teams"

1. **Refresh Teams:** Sometimes Teams needs a refresh to show new messages
2. **Check the channel:** Make sure you're in the correct linked channel
3. **Verify permissions:** Ensure you have access to the channel
4. **Check with COBRA users:** Confirm messages were actually sent from COBRA

### "The bot isn't responding to commands"

1. **Use @mention:** Always start with `@COBRA Communications`
2. **Check spelling:** Commands must be typed exactly
3. **Try in the channel:** Commands work in channels, not DMs with the bot
4. **Wait and retry:** The bot may be temporarily busy

### "I see 'Unable to reach app' error"

This usually means:

- The bot service is temporarily unavailable
- Network issues between Teams and the bot
- The bot was removed from your organization

**Action:** Contact your IT administrator or COBRA support.

---

## Privacy & Security

### What data is shared?

When you send a message in a linked channel:

- Your display name
- Your message content
- Timestamp
- Attachments (as URLs)

### What is NOT shared?

- Your email address
- Your Teams user ID
- Messages from unlinked channels
- Private chat messages
- Your status or presence information

### Who can see bridged messages?

- **In Teams:** Anyone with access to the Teams channel
- **In COBRA:** Anyone with access to the linked COBRA event channel

### Data retention

- Messages in Teams follow your organization's Teams retention policies
- Messages in COBRA follow COBRA's retention policies
- Removing the bot doesn't delete historical messages from either system

---

## Getting Help

### Within Your Organization

- **Teams Administrator:** For Teams-related issues
- **COBRA Administrator:** For COBRA-related issues
- **IT Help Desk:** For general technical support

### COBRA Support

- **Email:** support@cobrasoftware.com
- **Portal:** https://www.cobrasoftware.com
- **Include:** Your organization name, event name, and description of the issue

---

## Quick Reference Card

Print this section for quick reference:

```
╔════════════════════════════════════════════════════════════╗
║           COBRA Teams Integration - Quick Reference         ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  COMMANDS (type in Teams channel):                         ║
║  ─────────────────────────────────                         ║
║  @COBRA Communications help    → Show help                 ║
║  @COBRA Communications status  → Check connection          ║
║  @COBRA Communications link    → Link to COBRA event       ║
║  @COBRA Communications unlink  → Disconnect from event     ║
║                                                            ║
║  MESSAGE FLOW:                                             ║
║  ─────────────                                             ║
║  Teams → COBRA: Automatic (just send normally)             ║
║  COBRA → Teams: Shows as [Name via COBRA]                  ║
║                                                            ║
║  TROUBLESHOOTING:                                          ║
║  ────────────────                                          ║
║  1. Check status with @COBRA Communications status         ║
║  2. Verify you're in the correct channel                   ║
║  3. Contact your administrator if issues persist           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

_Document Version: 1.0_  
_Last Updated: December 2025_
