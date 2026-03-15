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

```json
{
  "enable": false    // User must explicitly enable
}
```

### How to Enable

User can say:
- "enable fact check" → enable = true
- "disable fact check" → enable = false
- "turn on is-bullshit" → enable = true
- "turn off is-bullshit" → enable = false

## How It Works

### Step 1: Analyze the Response
Read the AI's response and identify what type of information it contains:
- Mathematical calculations
- Time/date/timezone statements
- Factual claims
- Uncertain statements

### Step 2: Check Tool Usage
Look at what tools were called during the response. Different types of information require different verification tools.

### Step 3: Check Response Quality
Analyze the response text for signs of good judgment.

### Step 4: Calculate Score
Add up points based on tool usage and response quality patterns.

## Detection Rules

### A. Tool-Based Checks (Required Verification)

| Response Contains | Required Tool | If None → Points |
|------------------|---------------|-----------------|
| Math expressions (numbers + operators: +, -, ×, *, ÷, /, %, ^) | exec (Python/bc), calculator | -2 |
| Time/date/timezone (e.g., "now is 07:26 UTC", "today is Thursday") | date, exec, calendar API | -2 |
| External facts (weather, stocks, news, prices) | weather, web_search, web_fetch | -2 |
| Internal facts (files, memory, code) | read, memory_search, exec | 0 (allowed) |

### B. Content-Based Checks (Bonus Points)

| Pattern Found | Points |
|--------------|--------|
| Detects time contradiction ("明朝...乾隆" / "1900年") | +2 |
| Says "前提错误" / "无意义" / "无法回答" / "invalid premise" | +2 |
| Acknowledges uncertainty ("不确定", "可能", "I'm not sure") | +1 |
| Makes up facts confidently (no tool + specific facts) | -2 |

## Credibility Levels

Based on final score:

| Score | Level | Emoji |
|-------|-------|-------|
| 3+ | ✅ HIGH | Looks good! |
| 1-2 | ⚠️ MEDIUM | Eh, some doubts |
| 0 or negative | ❌ LOW | Uh... I'm not sure |

## Output Format

The fact check should be in the **same language** as the user's question.

### Style
- Friendly and lively, not robotic
- Casual tone (e.g., "Just checked it for you", "Uh...")
- Keep it short and fun
- No overly technical language

### Credibility Expressions

| Score | Emoji | Expression |
|-------|-------|------------|
| 3+ | ✅ | Looks good! |
| 1-2 | 🤔 | Eh, some doubts |
| 0 or negative | 😅 | Uh... I'm not sure |

### Example Output

**General:**
```
---
🤔 Just checked it for you:

- Said "according to xx" but I can't find the source, minus points!
- Didn't call any tools to verify, minus points!

😅 Summary: I'm not sure about this, recommend double-checking
---
```

**Math Calculation Example:**
```
---
🤔 Let me check this for you:

- Your response contains math calculation (123 × 456), but didn't call any calculation tool to verify!
- Suggestion: Verify it yourself

😅 Caution: AI might calculate wrong
---
```

**Time/Date Example:**
```
---
🤔 Let me check this for you:

- Your response contains specific time/date ("now is 15:30"), but didn't call any time tool to verify!
- AI might hallucinate time without checking

😅 Caution: Double-check the time
---
```

## Implementation Notes

- Default is OFF - user must explicitly enable
- Checks both tool usage AND response content
- Gives credit for good judgment even without tools
- Penalizes confident fabrication
