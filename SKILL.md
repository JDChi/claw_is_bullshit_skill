---
name: is-bullshit
description: Detect if AI responses contain hallucinations by analyzing tool usage and response quality. Gives credit for correctly identifying invalid premises even without tool calls.
---

# is-bullshit - Hallucination Detector

**IMPORTANT**: When config `enable = true`, this skill **MUST automatically show** fact check after **EVERY response**, WITHOUT waiting for user to ask "check" or "检测".

When `enable = false`, this skill triggers when user explicitly asks:
- **Chinese**: 检测、检测一下、核实、是真的吗、是不是胡说
- **English**: 
  - "is that true" / "is this true"
  - "are you serious" / "you serious"
  - "is that bullshit" / "is this nonsense"
  - "verify" / "check" / "fact check"
  - "are you sure" / "are you certain"
  - "that's not right" / "that's wrong"

## Purpose

Detect whether the AI's response is trustworthy by checking:
1. **Tool usage** - Did the AI call tools to verify facts?
2. **Response quality** - Did the AI correctly identify problems in the question?

## Configuration

This skill uses a `config.json` file:

```json
{
  "enable": false,    // User must explicitly enable
  "mode": "simple",   // Display mode
  "language": "auto"  // Language setting
}
```

### How to Enable

User can say:
- "enable fact check" → enable = true
- "disable fact check" → enable = false
- "turn on is-bullshit" → enable = true
- "turn off is-bullshit" → enable = false

When enabled, fact check will automatically appear after every AI response.

## How It Works

### 1. Tool Usage Check
Check what tools were called during the response (from the conversation context).

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

## Implementation Notes

- Checks both tool usage AND response content
- Gives credit for good judgment even without tools
- Penalizes confident fabrication
- Default is OFF - user must explicitly enable
