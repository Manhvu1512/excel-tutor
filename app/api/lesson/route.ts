import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Simple in-memory cache so we don't regenerate on every page load
const cache = new Map<string, string>();

export async function POST(req: Request) {
  const { topic, topicLongName, department } = await req.json();
  const cacheKey = `${topic}-${department}`;

  if (cache.has(cacheKey)) {
    return NextResponse.json({ content: cache.get(cacheKey) });
  }

  const prompt = `Generate a short, friendly lesson on the Excel function ${topic} for a ${department} professional.

Strict structure (use markdown):

## What it does
ONE sentence in plain English.

## When you'll use it daily
3 specific scenarios a ${department} person hits every week. Be concrete (e.g., "rolling up Q3 marketing spend across 12 cost centers"), not generic.

## The syntax
The formula structure. One code block.

## Quick example
A tiny 3-row example showing the function in use. Use a markdown table.

## The mistake everyone makes
The ONE mistake that trips up 80% of learners on this function.

Total length: under 200 words. Warm tone, like a senior colleague over coffee. Skip the fluff and the obvious.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content =
    message.content[0].type === "text" ? message.content[0].text : "";
  cache.set(cacheKey, content);

  return NextResponse.json({ content });
}
