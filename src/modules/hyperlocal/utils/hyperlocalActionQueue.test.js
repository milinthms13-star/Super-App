import { hyperlocalActionQueue } from "./hyperlocalActionQueue";

describe("hyperlocalActionQueue", () => {
  beforeEach(() => {
    window.localStorage.clear();
    hyperlocalActionQueue.clear();
  });

  test("push appends actions with metadata", () => {
    const queue = hyperlocalActionQueue.push({
      type: "place_order",
      payload: { orderId: "HL-1" },
    });

    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("place_order");
    expect(queue[0].payload).toEqual({ orderId: "HL-1" });
    expect(queue[0].id).toMatch(/^HLQ-/);
  });

  test("replace overwrites queue", () => {
    hyperlocalActionQueue.push({ type: "a", payload: {} });
    const replaced = hyperlocalActionQueue.replace([{ id: "manual-1", type: "b", payload: { ok: true } }]);
    expect(replaced).toEqual([{ id: "manual-1", type: "b", payload: { ok: true } }]);
  });

  test("clear empties queue", () => {
    hyperlocalActionQueue.push({ type: "a", payload: {} });
    hyperlocalActionQueue.clear();
    expect(hyperlocalActionQueue.getAll()).toEqual([]);
  });
});
