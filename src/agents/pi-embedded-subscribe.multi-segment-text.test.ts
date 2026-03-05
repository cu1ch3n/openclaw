import { describe, expect, it } from "vitest";
import {
  createStubSessionHarness,
  emitAssistantTextDelta,
  emitAssistantTextEnd,
} from "./pi-embedded-subscribe.e2e-harness.js";
import { subscribeEmbeddedPiSession } from "./pi-embedded-subscribe.js";

describe("subscribeEmbeddedPiSession - multi-segment text across tool calls", () => {
  it("includes all text segments across tool call boundaries in assistantTexts", () => {
    const { session, emit } = createStubSessionHarness();

    const subscription = subscribeEmbeddedPiSession({
      session,
      runId: "run",
      reasoningMode: "off",
    });

    // First assistant message with text before tool call
    emit({ type: "message_start", message: { role: "assistant" } });
    emitAssistantTextDelta({ emit, delta: "Let me check that. " });
    emitAssistantTextEnd({ emit, content: "Let me check that. " });
    emit({
      type: "message_end",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "Let me check that. " }],
      },
    });

    // Tool call happens (simulated by tool_use message)
    emit({
      type: "message_start",
      message: { role: "assistant" },
    });
    emit({
      type: "message_end",
      message: {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "tool_1",
            name: "Read",
            input: { file_path: "test.txt" },
          },
        ],
      },
    });

    // Tool result
    emit({
      type: "message_start",
      message: { role: "user" },
    });
    emit({
      type: "message_end",
      message: {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "tool_1",
            content: "File contents here",
          },
        ],
      },
    });

    // Second assistant message with text after tool call
    emit({ type: "message_start", message: { role: "assistant" } });
    emitAssistantTextDelta({ emit, delta: "The file contains important data." });
    emitAssistantTextEnd({ emit, content: "The file contains important data." });
    emit({
      type: "message_end",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "The file contains important data." }],
      },
    });

    // Both text segments should be present
    expect(subscription.assistantTexts).toEqual([
      "Let me check that.",
      "The file contains important data.",
    ]);
  });

  it("includes all text segments when reasoning mode is on without block replies", () => {
    const { session, emit } = createStubSessionHarness();

    const subscription = subscribeEmbeddedPiSession({
      session,
      runId: "run",
      reasoningMode: "on",
      // No onBlockReply - this triggers the problematic code path
    });

    // First assistant message with text before tool call
    emit({ type: "message_start", message: { role: "assistant" } });
    emitAssistantTextDelta({ emit, delta: "Let me check that. " });
    emitAssistantTextEnd({ emit, content: "Let me check that. " });
    emit({
      type: "message_end",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "Let me check that. " }],
      },
    });

    // Tool call
    emit({
      type: "message_start",
      message: { role: "assistant" },
    });
    emit({
      type: "message_end",
      message: {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "tool_1",
            name: "Read",
            input: { file_path: "test.txt" },
          },
        ],
      },
    });

    // Tool result
    emit({
      type: "message_start",
      message: { role: "user" },
    });
    emit({
      type: "message_end",
      message: {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "tool_1",
            content: "File contents here",
          },
        ],
      },
    });

    // Second assistant message with text after tool call
    emit({ type: "message_start", message: { role: "assistant" } });
    emitAssistantTextDelta({ emit, delta: "The file contains important data." });
    emitAssistantTextEnd({ emit, content: "The file contains important data." });
    emit({
      type: "message_end",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "The file contains important data." }],
      },
    });

    // Should keep the final consolidated text, not discard pre-tool-call text
    expect(subscription.assistantTexts.length).toBeGreaterThan(0);
    const allText = subscription.assistantTexts.join(" ");
    expect(allText).toContain("Let me check that");
    expect(allText).toContain("The file contains important data");
  });
});
