---
name: is-bullshit
description: Detect if AI responses contain hallucinations by checking tool usage logs AND response quality. Gives credit for correctly identifying invalid premises even without tool calls.
---

# is-bullshit - Hallucination Detector

## Purpose

Detect whether the AI's response is trustworthy by checking:
1. **Tool usage** - Did the AI call tools to verify facts?
2. **Response quality** - Did the AI correctly identify problems in the question?

## How It Works

### 1. Tool Usage Check
Read the log file to see what tools were called.

### 2. Response Quality Check
Analyze the response text for signs of good judgment:
- Detects invalid premises / time contradictions
- Acknowledges uncertainty
- Points out logical flaws
- Doesn't pretend to answer unanswerable questions

## Credibility Levels

### Based on Tool Calls

| Level | Tools Called | Meaning |
|-------|-------------|---------|
| ✅ HIGH | `weather`, `web_fetch`, `web_search`, `feishu_fetch_doc`, etc. | Verified with external data |
| ⚠️ MEDIUM | `exec`, `read`, `memory_search`, etc. | Referenced internal resources |
| ❌ LOW | None | No verification |

### Bonus: Response Quality

| Pattern Found | Bonus |
|--------------|-------|
| Detects time contradiction ("明朝...乾隆" / "1900年") | +2 |
| Says "前提错误" / "无意义" / "无法回答" | +2 |
| Acknowledges uncertainty ("不确定", "可能") | +1 |
| Makes up facts confidently | -2 |

### Final Score

| Score | Credibility |
|-------|-------------|
| 3+ | ✅ HIGH |
| 1-2 | ⚠️ MEDIUM |
| 0 or negative | ❌ LOW |

## Output Format

```
---
### 🔍 Fact Check

**Tools Used**: None
**Response Quality**: Correctly identified time contradiction
**Score**: +2 (bonus)

**Credibility**: ✅ HIGH

---
```

## Security & Safety

### File Access

This skill only reads **one specific log file**:
- **Path**: `/tmp/openclaw/openclaw-YYYY-MM-DD.log`
- **Example**: `/tmp/openclaw/openclaw-2026-03-13.log`
- **Format**: Daily rotating logs (one file per day)
- **Does NOT read any other files**

### Log File Format

The log file is a **JSON Lines** format (one JSON object per line):

```json
{"subsystem":"gateway","message":"feishu: received message...","time":"2026-03-13T10:09:20.871Z"}
{"subsystem":"plugin","message":"tool call: web_fetch params={...}","time":"2026-03-13T10:09:21.000Z"}
{"subsystem":"plugin","message":"tool done: web_fetch ok (150ms)","time":"2026-03-13T10:09:21.150Z"}
```

### What the Log Contains

The OpenClaw log file contains **only system metadata**, NOT user message content:

| Content | Included? |
|---------|-----------|
| Message IDs (e.g., `om_xxx`) | ✅ Yes |
| User IDs (e.g., `ou_xxx`) | ✅ Yes |
| Tool call names (e.g., `web_fetch`) | ✅ Yes |
| Tool call params (truncated) | ✅ Yes |
| Response timestamps | ✅ Yes |
| System events | ✅ Yes |
| **User message text** | ❌ **NO** |
| **API keys / secrets** | ❌ **NO** |
| **File contents** | ❌ **NO** |

**Proof**: See sample log entries above - only system-level metadata is logged.

### Handling Missing Logs

If the log file does not exist:
- Return "Unable to verify - log file not found"
- Do NOT throw errors
- Do NOT attempt to read other files
- Report: "Credibility: UNKNOWN"

### Platform API

Currently, OpenClaw does **not provide** a tool-call audit API or sanitized summary feed. Therefore, this skill must read the raw log file to function.

### What It Does NOT Do

- ❌ Does not read user files
- ❌ Does not read configuration files
- ❌ Does not access home directory
- ❌ Does not make network requests
- ❌ Does not modify any files

## Implementation Notes

- Checks both tool logs AND response content
- Gives credit for good judgment even without tools
- Penalizes confident fabrication
